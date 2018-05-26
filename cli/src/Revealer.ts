export default class Revealer {
  privateKey: string;

  constructor(privateKey: string) {
    this.privateKey = privateKey;
  }

  start() {
    console.log("Revealer started", this.privateKey);
  }

  exit() {
    console.log("Exiting...");
  }
}
