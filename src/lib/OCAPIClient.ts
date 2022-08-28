import fetch from "cross-fetch";
import * as vscode from "vscode";

interface TokenCache {
  expireTime: number;
  value: string;
}

interface Config {
  hostname: string;
  "client-id": string;
  "client-secret": string;
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
  private config: Config;
  private outputChannel: vscode.OutputChannel;
  private jobsData: JobsData;

  constructor(config: Config, outputChannel: vscode.OutputChannel) {
    this.config = config;
    this.outputChannel = outputChannel;

    this.tokenCache = {
      expireTime: 0,
      value: "",
    };

    this.jobsData = {};
  }

  log(text: string) {
    this.outputChannel.appendLine(text);
  }

  logWithPrefix(text: string) {
    this.log(`[${new Date().toISOString()}] SFCC_JOBS: ${text}`);
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
              `You can specify a longer timeout using @sfccJobTailLogTimeout 60000`
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
                this.config["client-id"] + ":" + this.config["client-secret"]
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
}
