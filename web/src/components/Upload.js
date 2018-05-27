import React, { Component } from "react";
import { observable, action } from "mobx";
import { observer } from "mobx-react";

@observer
export default class Upload extends Component {
  @observable isHovering = false;
  hoverCounter = 0;

  componentDidMount() {
    this.addEventListeners();
  }

  componentWillUnmount() {
    this.removeEventListeners();
    this.filesByName = null;
  }

  addEventListeners() {
    const target = this.box;
    if (target.__dragEventsSet) return;
    target.addEventListener("dragstart", this.handleDragStart);
    target.addEventListener("dragenter", this.handleEnter);
    target.addEventListener("dragleave", this.handleLeave);
    target.addEventListener("dragover", this.handleDragOver);
    target.addEventListener("drop", this.handleFileDrop);
    target.__dragEventsSet = true;
    this.__dragEventsSet = true;
  }

  removeEventListeners() {
    const target = this.box;
    if (!this.__dragEventsSet) return;
    target.removeEventListener("dragstart", this.handleDragStart);
    target.removeEventListener("dragenter", this.handleEnter);
    target.removeEventListener("dragleave", this.handleLeave);
    target.removeEventListener("dragover", this.handleDragOver);
    target.removeEventListener("drop", this.handleFileDrop);
    target.__dragEventsSet = false;
  }

  @action.bound
  handleEnter(e) {
    this.hoverCounter++;
    e.preventDefault();
    this.isHovering = true;
  }

  @action.bound
  handleLeave(e) {
    e.preventDefault();
    this.hoverCounter--;
    console.log(this.hoverCounter);
    if (this.hoverCounter === 0) {
      this.isHovering = false;
    }
  }

  @action.bound
  handleDragStart(e) {
    e.preventDefault();
  }

  @action.bound
  handleDragOver(e) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  }

  @action.bound
  async handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    this.isHovering = false;
    this.hoverCounter = 0;

    if (!e.dataTransfer || !e.dataTransfer.files) return;

    const file = e.dataTransfer.files[0];

    const dataUrl = await new Promise(resolve => {
      const fileReader = new FileReader();
      fileReader.onload = e => resolve(e.target.result);
      fileReader.readAsDataURL(file);
    });
    const buffer = await new Promise(resolve => {
      const fileReader = new FileReader();
      fileReader.onload = e => resolve(e.target.result);
      fileReader.readAsArrayBuffer(file);
    });

    this.props.onDrop(new Uint8Array(buffer), dataUrl);
  }

  render() {
    return (
      <div
        ref={div => (this.box = div)}
        style={{
          boxShadow: this.isHovering && "0 0 0 5px rgba(0, 0, 255, 0.3)"
        }}
      >
        {this.props.children}
      </div>
    );
  }
}
