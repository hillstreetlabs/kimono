export default class Combiner {
  privateKey: string;

  constructor(privateKey: string) {
    this.privateKey = privateKey;
  }

  start() {
    console.log("Combiner started", this.privateKey);
  }

  exit() {
    console.log("Exiting...");
  }
}
