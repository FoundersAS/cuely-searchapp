import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import { ipcRenderer, shell } from 'electron';

import { Scrollbars } from 'react-custom-scrollbars';
import SearchBar from './components/SearchBar';
import CuelyLogo from './logos/cuely-logo.svg';
import GoogleLogo from './logos/google-logo.png';

export default class App extends Component {
  constructor(props){
    super();
    this.handleInput = ::this.handleInput;
    this.handleInputClick = ::this.handleInputClick;
    this.handleKeyUp = ::this.handleKeyUp;
    this.renderItem = ::this.renderItem;
    this.resetState = ::this.resetState;
    this.state = {
      searchResults: [],
      selectedIndex: -1,
      clearInput: false
    }
  }

  resetState() {
    this.setState({ searchResults: [], selectedIndex: -1, clearInput: true });
  }

  componentDidMount() {
    ipcRenderer.on('searchResult', (event, arg) => {
      this.setState({ searchResults: arg, clearInput: false });
    });
    ipcRenderer.on('clear', () => {
      this.resetState();
    });
  }

  componentDidUpdate() {
    const h = this.getElementHeight("searchSuggestions") + this.getElementHeight("searchBar");
    ipcRenderer.send('search_rendered', { height: h });
    // focus selected item
    if (this.state.selectedIndex > -1) {
      const node = ReactDOM.findDOMNode(this.refs[`searchItem${this.state.selectedIndex}`]);
      if (node && node.children) {
        node.children[0].focus();
      }
    }
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
      if (e.target.value || this.state.selectedIndex > -1) {
        e.target.value = '';
        this.resetState();
      } else {
        ipcRenderer.send('hide-search');
      }
    } else if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) {
      e.preventDefault();
      let index = this.state.selectedIndex;
      index = (index >= this.state.searchResults.length - 1) ? index : index + 1;
      this.setState({ selectedIndex: index });
    } else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) {
      e.preventDefault();
      let index = this.state.selectedIndex;
      index = (index < 0) ? index : index - 1;
      this.setState({ selectedIndex: index });
    }
  }

  handleInput(e) {
    if (e.target.value) {
      ipcRenderer.send('search', e.target.value);
    } else {
      this.resetState();
    }
  }

  handleInputClick(e) {
    this.setState({ selectedIndex: -1 });
    this.refs.scrollbars.scrollToTop();
  }

  handleClick(e) {
    e.preventDefault();
    shell.openExternal(e.target.href);
    ipcRenderer.send('hide-search');
  }

  renderItem(item, i) {
    const liClass = (i === this.state.selectedIndex) ? 'search_suggestions_card_highlight' : 'search_suggestions_card';
    const icon = item.displayIcon ? item.displayIcon : (item.type === 'intra' ? CuelyLogo : GoogleLogo);

    return (
      <li key={i} className={liClass} ref={`searchItem${i}`}>
        <a href={item.webLink} onClick={this.handleClick} className="search_suggestion_card_link">
          <img src={icon} className="search_suggestions_logo" />
          <div className="search_suggestions_data">
            <div className="title" dangerouslySetInnerHTML={{ __html: item.title }} />
            <div className="body">
              {item.content ? (<pre className="content" dangerouslySetInnerHTML={{ __html: item.content }} />) : null}
              <div><span className="attribute_label">Modified:&nbsp;</span><span>{item.metaInfo.time}</span></div>
              {item.metaInfo.users.map(user => (<div className="user"><span className="attribute_label">{user.type}:&nbsp;</span><span className="user_name" dangerouslySetInnerHTML={{ __html: user.name }} ></span></div>))}
            </div>
          </div>
        </a>
      </li>
    )
  }

  renderSearchResults() {
    return (
      <div className="search_suggestions" id="searchSuggestions" onKeyUp={this.handleKeyUp}>
        <Scrollbars autoHeight autoHeightMin={0} autoHeightMax={400} style={{ border: 'none' }} ref="scrollbars">
          <ul className="search_suggestions_list">
            {this.state.searchResults.map(this.renderItem)}
          </ul>
        </Scrollbars>
      </div>
    );
  }

  render() {
    const open = this.state.searchResults.length > 0;
    return (
      <div className="search_root">
        <SearchBar
          onKeyUp={this.handleKeyUp}
          onInput={this.handleInput}
          onClick={this.handleInputClick}
          className={open ? "search_bar_open" : "search_bar"}
          id="searchBar"
          selectedIndex={this.state.selectedIndex}
          clearInput={this.state.clearInput}
        />
        {open ? this.renderSearchResults() : null}
      </div>
    );
  }
}
