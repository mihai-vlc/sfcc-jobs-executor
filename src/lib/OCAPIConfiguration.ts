export default class OCAPIConfiguration {
  private _hostname: string = "";
  private _clientId: string = "";
  private _clientSecret: string = "";

  get hostname() {
    return this._hostname;
  }

  get clientId() {
    return this._clientId;
  }

  get clientSecret() {
    return this._clientSecret;
  }

  update(config: string) {
    try {
      const parsedConfig = JSON.parse(config);

      this._hostname = parsedConfig["hostname"];
      this._clientId = parsedConfig["client-id"];
      this._clientSecret = parsedConfig["client-secret"];

      return true;
    } catch (e) {
      console.log("[SFCC_JOBS]", e);
      return false;
    }
  }

  isDefined() {
    return (
      this._hostname !== "" &&
      this._clientSecret !== "" &&
      this._clientId !== ""
    );
  }
}
