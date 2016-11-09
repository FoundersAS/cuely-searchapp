import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
require('../css/style-debug.scss');

export default class DebugLog extends Component {
  constructor(props){
    super();
    this.state = {
      settings: '',
      search: ''
    }
  }

  componentDidMount() {
    ipcRenderer.on('debug-result', (event, arg) => {
      console.log('new state is:', arg);
      this.setState(arg);
    });
    ipcRenderer.send('debug-load');
  }

  handleClose(e) {
    e.preventDefault();
    ipcRenderer.send('close-debug');
  }

  render() {
    return (
      <div>
        <div className="debug_body">
          <div>Settings:</div>
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
