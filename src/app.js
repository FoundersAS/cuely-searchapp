import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import { ipcRenderer } from 'electron';

import { Scrollbars } from 'react-custom-scrollbars';
import SearchBar from './components/SearchBar';

export default class App extends Component {
  constructor(props){
    super();
    this.handleInput = ::this.handleInput;
    this.handleKeyUp = ::this.handleKeyUp;
    this.state = {
      searchResults: []
    }
  }

  componentDidMount() {
    ipcRenderer.on('searchResult', (event, arg) => {
      this.setState({ searchResults: arg });
      console.log(arg);
    });
  }

  componentDidUpdate() {
    const h = this.getElementHeight("searchSuggestions") + this.getElementHeight("searchBar");
    ipcRenderer.send('search_rendered', { height: h });
  }

  getElementHeight(id) {
    const el = document.getElementById(id);
    if (!el) {
      return 0;
    }
    const styleHeight = window.getComputedStyle(el).getPropertyValue("height").slice(0, -2);
    return parseInt(styleHeight);
  }


  handleKeyUp(e) {
    if (e.key === 'Escape') {
      if (e.target.value) {
        e.target.value = '';
        this.setState({ searchResults: [] });
      } else {
        ipcRenderer.send('quit');
      }
    }
  }

  handleInput(e) {
    if (e.target.value) {
      ipcRenderer.send('search', e.target.value);
    } else {
      this.setState({ searchResults: [] });
    }
  }

  renderItem(item, i) {
    return (
      <li key={i} className="search_suggestions_li">
        <div>{item.tag}:{item.question}</div>
      </li>
    )
  }

  renderSearchResults() {
    return (
      <div className="search_suggestions" id="searchSuggestions">
        <Scrollbars autoHeight autoHeightMin={0} autoHeightMax={400} style={{ border: 'none' }}>
          <ul className="search_suggestions_ul">
            {this.state.searchResults.map(this.renderItem)}
          </ul>
        </Scrollbars>
      </div>
    );
  }

  render() {
    console.log(this.state);
    const open = this.state.searchResults.length > 0;
    return (
      <div className="search_root">
        <SearchBar onKeyUp={this.handleKeyUp} onInput={this.handleInput} className={open ? "search_bar_open" : "search_bar"} id="searchBar" />
        {open ? this.renderSearchResults() : null}
      </div>
    );
  }
}
