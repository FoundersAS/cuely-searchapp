import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import { ipcRenderer } from 'electron';
import SearchBar from './components/SearchBar';

export default class App extends Component {
  constructor(props){
    super();
  }

  handleKeyDown(e) {
    console.log(e.key);
    if (e.key === 'Escape') {
      ipcRenderer.send('quit');
    }
  }

  render() {
    return (
      <SearchBar onKeyDown={this.handleKeyDown} />
    );
  }
}

var app = document.getElementById('app');
ReactDOM.render(<App />, app);
