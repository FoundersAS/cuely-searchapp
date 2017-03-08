import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
require('../css/style-settings.scss');

export default class Welcome extends Component {
  constructor(props){
    super();
    this.handleDone = ::this.handleDone;
    this.handleKeyDown = ::this.handleKeyDown;
    this.handleKeyUp = ::this.handleKeyUp;
    this.state = {
      globalShortcut: 'Cmd+Backspace',
      newShortcut: '',
      errorMessage: '',
      integration: ''
    }
    this.keyCombo = [];
  }

  componentDidMount() {
    ipcRenderer.on('welcome-save-failed', (event, msg) => {
      this.setState({ errorMessage: msg });
    });
    ipcRenderer.on('welcome-load-result', (event, integrationName) => {
      this.setState({ integration: integrationName });
    });
    ipcRenderer.send('welcome-load');
  }

  handleDone(e) {
    e.preventDefault();
    if (this.state.newShortcut) {
      this.state.globalShortcut = this.state.newShortcut;
    }
    ipcRenderer.send('welcome-save', this.state.globalShortcut);
  }

  handleKeyUp(e) {
    this.keyCombo = [];
  }

  handleKeyDown(e) {
    e.preventDefault();
    let key = e.key;
    if (e.keyCode === 32) {
      key = 'Space';
    }
    if (key === 'Meta') {
      key = 'Cmd';
    }
    if (key === 'Alt') {
      key = 'Option';
    }
    if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) {
      this.keyCombo.push(key);
      this.setState({ newShortcut: this.keyCombo.join('+') });
      return;
    }
    if (key === 'Backspace') {
      this.keyCombo = [];
      this.setState({ newShortcut: '' });
    }
  }

  render() {
    return (
      <div className="welcome">
        <div className="info">
          <div className="title">You have successfully logged in to Cuely!</div>
          <hr />
          <div className="paragraph">
            Cuely is now syncing with your {this.state.integration} data. It may take some time before all of the data is synced, but you can start searching already and Cuely will return the results based on the data that has been synced so far. Here are a few tips before you start using Cuely:
            <ul>
              <li>Cuely can always be accessed via a shortcut. Configure it below to your prefered key combination.</li>
              <li>To search for a document or any other piece of data, just type in the query and you will see the recent items matching your search.</li>
              <li>Use preferences to change settings, add integrations or manage your account.</li>
              <li>Launch apps or access system preferences - try with <code>safari</code> or <code>network</code>.</li>
              <li>Cuely can search your local drive, if you prepend the query with <code>mac</code> keyword. For example, <code>mac invoice</code> will find files or folders that match <i>invoice</i>.</li>
              <li>Cuely can be used as a calculator and currency/unit converter. Try following: <code>55*(33+128)</code> or <code>500eur to cad</code> or <code>185cm to feet</code> or <code>1acre to m2</code></li>
            </ul>
          </div>
          <hr />
        </div>        
        <div className="settings">
          <div>
            <div className="options">
              <div className="row">
                <div className="left">
                  Cuely Shortcut:
                </div>
                <div className="right">
                  <input
                    type="text"
                    placeholder="Press a key combination"
                    onKeyUp={this.handleKeyUp}
                    onKeyDown={this.handleKeyDown}
                    value={this.state.newShortcut} />
                </div>
              </div>
              {this.state.errorMessage ? (
                <div className="row">
                  <div className="left" />
                  <div className="error">
                    {this.state.errorMessage}
                  </div>
                </div>
                ) : null}
            </div>
          </div>
        </div>
        <div className="actions">
          <a href="#" onClick={this.handleDone}>Done ></a>
        </div>
      </div>
    );
  }
}
