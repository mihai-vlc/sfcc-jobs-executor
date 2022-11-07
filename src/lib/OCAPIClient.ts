import fetch from "cross-fetch";
import * as vscode from "vscode";
import FilteredLogger from "./FilteredLogger";
import OCAPIConfiguration from "./OCAPIConfiguration";

interface TokenCache {
  expireTime: number;
  value: string;
}
interface JobsData {
  [key: string]: {
    executionId: number;
    logFilePath: string;
    status: string;
    logFileSize: number;
  };
}

export default class OCAPIClient {
  private tokenCache: TokenCache;
  private config: OCAPIConfiguration;
  private logger: FilteredLogger;
  private jobsData: JobsData;

  constructor(config: OCAPIConfiguration, logger: FilteredLogger) {
    this.config = config;
    this.logger = logger;

    this.tokenCache = {
      expireTime: 0,
      value: "",
    };

    this.jobsData = {};
  }

  log(text: string) {
    this.logger.log(text);
  }

  logWithPrefix(text: string) {
    this.log(`[${new Date().toISOString()}] SFCC_JOBS: ${text}`);
  }

  isConfigured() {
    return this.config.isDefined();
  }

  async executeJob(jobId: string) {
    try {
      this.jobsData[jobId] = {
        executionId: 0,
        logFilePath: "",
        status: "",
        logFileSize: 0,
      };

      const url = `https://${this.config.hostname}/s/-/dw/data/v22_6/jobs/${jobId}/executions`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await this.getAccessToken()}`,
        },
      });

      if (!response.ok) {
        this.log(await response.text());
        return;
      }

      const data = await response.json();

      this.jobsData[jobId].logFilePath = data.log_file_path;
      this.jobsData[jobId].status = data.execution_status;
      this.jobsData[jobId].executionId = data.id;

      this.logWithPrefix(
        `Job ${jobId} started, current status: ${data.execution_status}`
      );

      return data.execution_status;
    } catch (e) {
      if (e instanceof Error) {
        this.log(e.message);
      }
    }
    return "finished";
  }

  async getJobStatus(jobId: string, executionId: number) {
    try {
      const url = `https://${this.config.hostname}/s/-/dw/data/v22_6/jobs/${jobId}/executions/${executionId}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${await this.getAccessToken()}`,
        },
      });

      if (!response.ok) {
        this.log(await response.text());
        return "finished";
      }

      const data = await response.json();
      return data.execution_status;
    } catch (e) {
      if (e instanceof Error) {
        this.log(e.message);
      }
    }
    return "finished";
  }

  async tailJobLogs(jobId: string, timeout: number = 60000) {
    const jobData = this.jobsData[jobId];

    if (!jobData) {
      return;
    }
    this.logWithPrefix(
      `Start tail logs monitoring from https://${this.config.hostname}/on/demandware.servlet/webdav${jobData.logFilePath} , timeout: ${timeout}ms`
    );

    // give some time for the logs to be written
    await this.sleep(2000);

    try {
      let content = await this.getLogFileContent(jobData.logFilePath);
      this.log(content.text);

      jobData.logFileSize = content.fileSize;

      let startTime = new Date().getTime();
      let endTime = startTime + timeout;

      while (jobData.status === "pending" || jobData.status === "running") {
        if (endTime < new Date().getTime()) {
          this.logWithPrefix(
            `Execution timeout of ${timeout}ms reached, stopping tail watch.` +
              `You can specify a longer timeout using @sfccJobTailLogTimeout 60000 or from the jobs panel.`
          );
          break;
        }

        await this.sleep(1500);

        jobData.status = await this.getJobStatus(jobId, jobData.executionId);

        if (jobData.status !== "running") {
          this.logWithPrefix(`${jobId} status: ${jobData.status}`);
        }

        const newSize = await this.getLogFileSize(jobData.logFilePath);

        if (newSize > jobData.logFileSize) {
          let content = await this.getLogFileContent(
            jobData.logFilePath,
            `${jobData.logFileSize}-${newSize}`
          );

          jobData.logFileSize = newSize;

          this.log(content.text);
        }
      }
    } catch (e) {
      if (e instanceof Error) {
        this.log(e.message);
      }
    }
  }

  sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getLogFileContent(logFilePath: string, range?: string) {
    try {
      const url = `https://${this.config.hostname}/on/demandware.servlet/webdav/${logFilePath}`;
      const headers: HeadersInit = {
        Authorization: `Bearer ${await this.getAccessToken()}`,
      };

      if (range) {
        headers.Range = `bytes=${range}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: headers,
      });

      if (!response.ok) {
        this.log(await response.text());
        return {
          fileSize: 0,
          text: "",
        };
      }

      return {
        fileSize: parseInt(response.headers.get("content-length") || "0", 10),
        text: await response.text(),
      };
    } catch (e) {
      if (e instanceof Error) {
        this.log(e.message);
      }
    }
    return {
      fileSize: 0,
      text: "",
    };
  }

  async getLogFileSize(logFilePath: string) {
    try {
      const url = `https://${this.config.hostname}/on/demandware.servlet/webdav${logFilePath}`;
      const headers = {
        Authorization: `Bearer ${await this.getAccessToken()}`,
      };
      const response = await fetch(url, {
        method: "HEAD",
        headers: headers,
      });

      if (!response.ok) {
        this.log(await response.text());
        return 0;
      }

      return parseInt(response.headers.get("content-length") || "0", 10);
    } catch (e) {
      if (e instanceof Error) {
        this.log(e.message);
      }
    }
    return 0;
  }

  async getAccessToken() {
    if (this.config.username && this.config.password) {
      return await this.getAccessTokenWithBMUserGrant();
    }

    if (this.tokenCache.expireTime > new Date().getTime()) {
      return this.tokenCache.value;
    }

    try {
      const response = await fetch(
        "https://account.demandware.com/dwsso/oauth2/access_token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization:
              "Basic " +
              Buffer.from(
                this.config.clientId + ":" + this.config.clientSecret
              ).toString("base64"),
          },
          body: "grant_type=client_credentials",
        }
      );

      if (!response.ok) {
        this.log(await response.text());
        return;
      }

      const data = await response.json();

      this.tokenCache = {
        expireTime: new Date().getTime() + data.expires_in * 1000,
        value: data.access_token,
      };
      return this.tokenCache.value;
    } catch (e) {
      if (e instanceof Error) {
        this.log(e.message);
      }
    }
  }

  async getAccessTokenWithBMUserGrant() {
    if (this.tokenCache.expireTime > new Date().getTime()) {
      return this.tokenCache.value;
    }

    try {
      const response = await fetch(
        `https://${this.config.hostname}/dw/oauth2/access_token?client_id=${this.config.clientId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization:
              "Basic " +
              Buffer.from(
                this.config.username +
                  ":" +
                  this.config.password +
                  ":" +
                  this.config.clientSecret
              ).toString("base64"),
          },
          body: "grant_type=urn:demandware:params:oauth:grant-type:client-id:dwsid:dwsecuretoken",
        }
      );

      if (!response.ok) {
        this.log(await response.text());
        return;
      }

      const data = await response.json();

      this.tokenCache = {
        expireTime: new Date().getTime() + data.expires_in * 1000,
        value: data.access_token,
      };
      return this.tokenCache.value;
    } catch (e) {
      if (e instanceof Error) {
        this.log(e.message);
      }
    }
  }
}
