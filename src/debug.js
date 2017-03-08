import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
require('../css/style-debug.scss');

export default class DebugLog extends Component {
  constructor(props){
    super();
    this.state = {
      settings: '',
      settingsLocation: '',
      search: ''
    }
  }

  componentDidMount() {
    ipcRenderer.on('debug-result', (event, arg) => {
      this.setState(arg);
    });
    ipcRenderer.send('debug-load');
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Escape') {
        ipcRenderer.send('close-debug');
      }
    }, false);
  }

  handleClose(e) {
    e.preventDefault();
    ipcRenderer.send('close-debug');
  }

  render() {
    return (
      <div>
        <div className="debug_body">
          <div>Settings location:</div>
          <pre>{this.state.settingsLocation}</pre>
          <div>Settings content:</div>
          <pre>{this.state.settings}</pre>
          <div>Searches:</div>
          <pre>{this.state.search}</pre>
        </div>
        <div className="login_actions">
          <a href="#" onClick={this.handleClose}>Close</a>
        </div>
      </div>
    );
  }
}
