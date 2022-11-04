import * as vscode from "vscode";
import JobDetails from "./JobDetails";
import OCAPIClient from "./OCAPIClient";

export default class JobRunner {
  private _lastJobId: string = "";

  constructor(
    private ocapi: OCAPIClient,
    private outputChannel: vscode.OutputChannel
  ) {}

  get lastJobId() {
    return this._lastJobId;
  }

  isConfigured() {
    return this.ocapi.isConfigured();
  }

  async run(jobDetails: JobDetails) {
    this._lastJobId = jobDetails.jobId;

    if (jobDetails.shouldClearLog) {
      this.outputChannel.clear();
    }
    const jobId = jobDetails.jobId;
    const timeout = jobDetails.timeout;

    this.outputChannel.show(true);
    const status = await this.ocapi.executeJob(jobId);

    if (status === "running" || status === "pending") {
      await this.ocapi.tailJobLogs(jobId, timeout);
    }
  }
}
