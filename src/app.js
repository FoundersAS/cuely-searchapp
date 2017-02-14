require('../css/style.scss');
import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import { ipcRenderer, shell, clipboard, remote } from 'electron';
import { Scrollbars } from 'react-custom-scrollbars';
import SearchBar from './components/SearchBar';
import SideBar from './components/SideBar';
import GdriveContent from './components/GdriveContent';
import IntercomContent from './components/IntercomContent';
import PipedriveContent from './components/PipedriveContent';
import HelpscoutContent from './components/HelpscoutContent';
import HelpscoutDocsContent from './components/HelpscoutDocsContent';
import JiraContent from './components/JiraContent';
import GithubRepoContent from './components/GithubRepoContent';
import GithubCommitContent from './components/GithubCommitContent';
import GithubFileContent from './components/GithubFileContent';
import GithubIssueContent from './components/GithubIssueContent';
import CurrencyContent from './components/CurrencyContent';
import LocalFileContent from './components/LocalFileContent';

const icons = [
  {
    type: 'application/vnd.google-apps.document',
    spriteOffset: 0
  },
  {
    type: 'application/vnd.google-apps.spreadsheet',
    spriteOffset: 3
  },
  {
    type: 'image',
    spriteOffset: 1
  },
  {
    type: 'application/vnd.google-apps.presentation',
    spriteOffset: 2
  },
  {
    type: 'application/vnd.google-apps.form',
    spriteOffset: 4
  },
  {
    type: 'application/vnd.google-apps.drawing',
    spriteOffset: 5
  },
  {
    type: 'application/vnd.google-apps.folder',
    spriteOffset: 6
  },
  {
    type: 'intercom',
    spriteOffset: 7
  },
  {
    type: 'salesforce',
    spriteOffset: 8
  },
  {
    type: 'trello',
    spriteOffset: 9
  },
  {
    type: 'github',
    spriteOffset: 10
  },
  {
    type: 'stripe',
    spriteOffset: 11
  },
  {
    type: 'application/pdf',
    spriteOffset: 12
  },
  {
    type: 'pipedrive',
    spriteOffset: 13
  },
  {
    type: 'helpscout',
    spriteOffset: 14
  },
  {
    type: 'gmail',
    spriteOffset: 15
  },
  {
    type: 'gcal',
    spriteOffset: 16
  },
  {
    type: 'math',
    spriteOffset: 17
  },
  {
    type: 'currency',
    spriteOffset: 17
  },
  {
    type: 'google',
    spriteOffset: 18
  },
  {
    type: 'jira',
    spriteOffset: 19
  },
  {
    type: 'cuely',
    spriteOffset: 20
  },
  {
    type: 'mac',
    spriteOffset: 21
  },
  {
    type: 'gdrive',
    spriteOffset: 22
  }
];

export default class App extends Component {
  constructor(props) {
    super();
    this.handleInput = ::this.handleInput;
    this.handleKeyUp = ::this.handleKeyUp;
    this.handleKeyDown = ::this.handleKeyDown;
    this.renderItem = ::this.renderItem;
    this.handleClick = ::this.handleClick;
    this.handleDoubleClick = ::this.handleDoubleClick;
    this.handleContentKeyDown = ::this.handleContentKeyDown;
    this.handleDragEnd = ::this.handleDragEnd;
    this.hideHover = ::this.hideHover;
    this.showHover = ::this.showHover;
    this.handleMouseMove = ::this.handleMouseMove;
    this.handleExternalLink = ::this.handleExternalLink;
    this.handleActionIconLinkClick = ::this.handleActionIconLinkClick;
    this.handleMouseEnter = ::this.handleMouseEnter;
    this.openExternalLink = ::this.openExternalLink;
    this.getIntegrationComponent = ::this.getIntegrationComponent;
    this.copyValueToClipboard = ::this.copyValueToClipboard;
    this.handleLocalAppInFinder = ::this.handleLocalAppInFinder;
    this.handleLocalAppPreview = ::this.handleLocalAppPreview;
    this.handleSidebarIntegrationClick = ::this.handleSidebarIntegrationClick;
    this.state = {
      noResultsYet: true,
      searchResults: [],
      selectedIndex: -1,
      clearInput: false,
      keyFocus: false,
      integrations: [],
      searchError: null,
      companyDomain: ''
    }
    this.hoverDisabled = false;
    this.segmentTimer = null;
  }

  componentDidMount() {
    // start empty search (should return 10 most recent items by signed in user name)
    ipcRenderer.send('search', '', Date.now(), true);

    ipcRenderer.on('search-result', (event, arg) => {
      this.userDir = arg.userDir;
      this.setState({
        noResultsYet: false,
        searchResults: arg.items,
        clearInput: false,
        selectedIndex: arg.items.length > 0 ? 0 : -1,
        keyFocus: false
      });
    });
    ipcRenderer.on('search-error', (event, info) => {
      this.setState({ searchError: info });
    });
    ipcRenderer.on('search-error-clear', event => {
      this.setState({ searchError: null });
    });
    ipcRenderer.on('integrations-load', (event, integrations) => {
      this.setState({ integrations });
    });
    ipcRenderer.on('notification', (event, arg) => {
      // show desktop notification
      new Notification(arg.title, arg);
    });
    ipcRenderer.on('focus-element', (event, selector) => {
      //set focus on searchbar after window comes into foreground
      this.refs.searchBar.setFocus();
    });
    ipcRenderer.on('end-session', (event, selector) => {
      //empty search result box
      this.setState({ clearInput: true });
      ipcRenderer.send('search', '', Date.now(), false);
      this.refs.sideBar.changeIcon('');
    });
    ipcRenderer.on('setting-domain', (event, domain) => {
      this.setState({ companyDomain : domain });
    });
  }

  componentDidUpdate() {
    const content = document.getElementById("searchSuggestionsContent");
    if (content) {
      // scroll the content to first highlight result (or to beginning if there's no highlighted result)
      const elms = document.getElementsByClassName("algolia_highlight");
      if (elms && elms.length > 0) {
        let elm = elms[0];
        if (elm.parentElement.nodeName === 'TD' || elm.parentElement.nodeName === 'TH') {
          elm = elm.parentElement;
        }
        content.scrollTop = elm.offsetTop - 150;
        content.scrollLeft = elm.offsetLeft - 50;
      } else {
        content.scrollTop = 0;
        content.scrollLeft = 0;
      }
    }

    if (this.refs.scrollbars && this.state.selectedIndex > -1) {
      const node = ReactDOM.findDOMNode(this.refs[`searchItem_${this.state.selectedIndex}`]);
      if (node && node.children) {
        node.children[0].focus();
      }
    }
    this.refs.searchBar.setFocus();
  }

  handleKeyDown(e) {
    let index = this.state.selectedIndex;
    if (this.isDown(e) || this.isUp(e)) {
      e.preventDefault();

      if (this.isDown(e)) {
        index = (index >= this.state.searchResults.length - 1) ? index : index + 1;
        this.setState({ selectedIndex: index, keyFocus: true });
      } else if (this.isUp(e)) {
        index = (index < 1) ? index : index - 1;
        this.setState({ selectedIndex: index, keyFocus: true });
      }
    } else if (e.key === 'PageUp') {
        index = (index < 5) ? 0 : index - 4;
        this.setState({ selectedIndex: index, keyFocus: true });
    } else if (e.key === 'PageDown') {
        index = (index >= this.state.searchResults.length - 4) ? this.state.searchResults.length - 1 : index + 4;
        this.setState({ selectedIndex: index, keyFocus: true });
    }
  }

  handleContentKeyDown(e) {
    // allow 'meta' actions (e.g. copy to clipboard), but pass the rest to input
    if ((e.ctrlKey || e.metaKey) && e.key !== 'a') {
      return;
    }
    // pass focus to search bar, so key up event will fire on input instead of content
    this.refs.searchBar.setFocus();
  }

  handleKeyUp(e) {
    let index = this.state.selectedIndex;

    if (e.key === 'Escape') {
      ipcRenderer.send('hide-search');
    } else if (e.key === 'Enter') {
      const item = this.state.searchResults[index];

      //if item has link we open the link otherwise we enable copying to clipboard on enter (eg calculator results)
      if (item.webLink){
        this.openExternalLink(item.webLink, 'enter', item.type);  
      } else {
        this.copyValueToClipboard();
      }
    }

    this.hideHover();
  }
  
  isUp(e) {
    return (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p'));
  }

  isDown(e) {
    return (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n'));
  }

  copyValueToClipboard(){
    const item = this.state.searchResults[this.state.selectedIndex];
    clipboard.writeText(item.titleRaw);
    ipcRenderer.send('send-notification', { title: 'Value Copied', body: `${item.titleRaw} has been copied to your clipboard.` });
    ipcRenderer.send('track', { name: 'Copy value', props: {} });
  }

  handleInput(e) {
    const q = e.target.value;
    ipcRenderer.send('search', q, Date.now(), false);
    this.refs.sideBar.changeIcon(q);
    if (this.segmentTimer) {
      clearTimeout(this.segmentTimer);
    }
    if (q.length > 0) {
      this.segmentTimer = setTimeout(() => {
        ipcRenderer.send('track', { name: 'Search', props: { query: q } });
      }, 1000);
    }
  }

  handleClick(e) {
    e.preventDefault();
    const index = this.getIndex(e.target.id);

    if (index > -1) {
      if (index == this.state.selectedIndex){
        this.handleDoubleClick(e);
      }
      else {
        this.setState({ selectedIndex: index, keyFocus: false });
        this.hideHover();
      }  
    }
  }

  handleDoubleClick(e) {
    e.preventDefault();
    const item = this.state.searchResults[this.getIndex(e.target.id)];

    if (item.webLink){
      this.openExternalLink(item.webLink, 'double click', item.type);  
    }
    else {
      this.copyValueToClipboard();
    }
  }

  handleExternalLink(e) {
    e.preventDefault();
    const item = this.state.searchResults[this.state.selectedIndex];
    this.openExternalLink(item.webLink, 'view in app button', item.type);
  }

  openExternalLink(link, triggerType, itemType=null) {
    if(itemType && itemType.startsWith('local-')) {
      if (itemType === 'local-folder') {
        shell.showItemInFolder(link);
      } else if (link.endsWith('Finder.app')) {
        shell.showItemInFolder(this.userDir + '/Documents');
      } else {
        ipcRenderer.send('hide-search');
        shell.openItem(link);
      }
    } else {
      shell.openExternal(link);
    }
    
    if (itemType !== 'local-app') {
      ipcRenderer.send('keep-search');
    }
    ipcRenderer.send('track', { name: 'Open link', props: { type: triggerType, integration: itemType } });
  }

  handleActionIconLinkClick(e) {
    e.preventDefault();

    let index = this.state.selectedIndex;
    
    if (index > -1) {
      clipboard.writeText(this.state.searchResults[index].webLink);
      const docName = this.state.searchResults[index].titleRaw;
      ipcRenderer.send('send-notification', { title: 'Copied link to clipboard ✓', body: `Cuely has copied link for ${docName} to clipboard` });
      ipcRenderer.send('track', { name: 'Copy link', props: {} });
    }
  }

  handleLocalAppInFinder(e) {
    e.preventDefault();

    const item = this.state.searchResults[this.state.selectedIndex];
    shell.showItemInFolder(item.webLink);
  }

  handleLocalAppPreview(e) {
    e.preventDefault();

    const index = this.getIndex(e.target.id);
    let item = this.state.searchResults[this.state.selectedIndex];

    //this handles the case when someone presses on the actionLink within the item
    if (index > -1) {
      item = this.state.searchResults[index];
    }

    ipcRenderer.send('previewFile', item.webLink);
  }

  handleMouseMove(e) {
    const index = this.getIndex(e.target.id);
    if (index === this.state.selectedIndex) {
      this.hideHover();
      return;
    }
    if (!this.hoverDisabled) {
      this.showHover();
    }
    this.hoverDisabled = false;
  }

  handleMouseEnter(e) {
    // const index = this.getIndex(e.target.id);
    // if (index > -1) {
    //   const link = document.getElementById("searchItemLink_" + index);
    //   link.className = "search_suggestions_card_link_action_hover";
    // }
  }

  handleDragEnd(e) {
    e.preventDefault();
    this.refs.searchBar.setFocus();
  }

  hideHover() {
    this.hoverDisabled = true;
    this.applyClassToSuggestions('search_suggestions_card_link_no_hover');
  }

  showHover() {
    this.hoverDisabled = false;
    this.applyClassToSuggestions('search_suggestions_card_link');
  }

  handleSettingsClick() {
    ipcRenderer.send('openSettings');
  }

  applyClassToSuggestions(klas) {
    const itemList = document.getElementById("searchSuggestionsList");
    if (itemList) {
      const items = [].slice.call(itemList.getElementsByTagName('a')).filter(tag => tag.id.indexOf('searchItemLink') > -1);
      for (let item of items) {
        item.className = klas;
      }
    }
  }

  getIndex(elementId) {
    return elementId ? parseInt(elementId.split('_').slice(-1)[0]) : -1;
  }

  initials(username) {
    return username.split(' ').map(x => x[0]).slice(0, 2).join('');
  }

  renderItem(item, i) {
    const liClass = (i === this.state.selectedIndex) ? 'search_suggestions_card search_suggestions_card_highlight' : 'search_suggestions_card';
    const icon = this.getIcon(item);

    return (
      <li key={i} className={liClass} ref={`searchItem_${i}`}>
        <a href="#" onClick={this.handleClick} onDoubleClick={this.handleDoubleClick} onKeyDown={this.handleKeyDown} onMouseMove={this.handleMouseMove} className="search_suggestions_card_link" id={`searchItemLink_${i}`}>
          <div className="search_suggestions_logo_container">
            <div style={icon.inlineStyle} className={icon.style} />
          </div>
          <div className="search_suggestions_data">
            <div className="heading">
              <div className="title" dangerouslySetInnerHTML={{ __html: item.title }} />
              {item.metaInfo && item.metaInfo.users && item.metaInfo.users.length > 0 ? this.renderAvatar(item) : null}
            </div>
            {item.metaInfo ? this.renderBody(item) : null}
          </div>
        </a>
        {this.renderActionItems(item, i)}
      </li>
    )
  }

  getIcon(item) {
    let displayIcon = {
      'style' : 'search_suggestions_logo'
    };
    
    if (item.type.startsWith('local-')) {
      if (item.displayIcon) {
        displayIcon.inlineStyle = {
          'backgroundImage': `url("${item.displayIcon}")`
        }
      }
    } else {
      for (let itemIcons of icons){
        if (itemIcons.type == item.mime) {
          const verticalOffset = itemIcons.spriteOffset*(-17) + 'px';

          displayIcon.inlineStyle = { 'backgroundPosition': '0 ' + verticalOffset };
          displayIcon.style = displayIcon.style + ' search_suggestions_logo_sprite';
          return (displayIcon);
        }
      }
    }

    //case where there was no icon found => let's insert placeholder
    if (!displayIcon.inlineStyle) {
      displayIcon.style = displayIcon.style + ' glyphicons glyphicons-question-sign';
    }

    return (displayIcon);
  }

  renderAvatar(item) {
    return (
      <div className="avatars">
        {item.metaInfo.users[0].avatar
            ? <div style={{ backgroundImage: 'url(' + item.metaInfo.users[0].avatar + ')' }} className={item.metaInfo.users[0].nameHighlight ? "avatar active" : "avatar"} />
            : <div className={item.metaInfo.users[0].nameHighlight ? "avatar no_avatar active" : "avatar no_avatar"}>{this.initials(item.metaInfo.users[0].name)}</div>}
      </div>
    );
  }

  renderBody(item) {
      return (
        <div className="body">
          {item.metaInfo.time ? (
            <div className="meta_group">
              <div className="meta_icon glyphicons glyphicons-clock"></div>
              <div className="meta_data">{item.metaInfo.time}</div>
            </div>) : null}
          {this.getIntegrationComponent(item).itemStatus()}
        </div>
      );
  }

  renderActionItems(item, i) {
    if (item.metaInfo) {
      if (item.type === 'local-file') {
        return (
          <span id={`actionIcon_${i}`} className="action_icon glyphicons glyphicons-search" onClick={this.handleLocalAppPreview} onMouseEnter={this.handleMouseEnter}></span>
        );
      }
      else {
        return (
          <span id={`actionIcon_${i}`} className="action_icon glyphicons glyphicons-arrow-right" onClick={this.handleDoubleClick} onMouseEnter={this.handleMouseEnter}></span>
        );
      }      
    }
    else {
      if (item.type === 'math' || item.type === 'currency') {
        return (
          <span id={`actionIcon_${i}`} className="action_icon action_icon_no_meta_info glyphicons glyphicons-more-items" onClick={this.copyValueToClipboard} onMouseEnter={this.handleMouseEnter}></span>
        );
      } else {
        return (
          <span id={`actionIcon_${i}`} className="action_icon action_icon_no_meta_info glyphicons glyphicons-arrow-right" onClick={this.handleDoubleClick} onMouseEnter={this.handleMouseEnter}></span>
        );
      }
    }
  }

  renderSearchResults() {
    const selectedItem = this.state.selectedIndex > -1 ? this.state.searchResults[this.state.selectedIndex] : null;
    return (
      <div className="search_suggestions" id="searchSuggestions" onKeyUp={this.handleKeyUp} onKeyDown={this.handleContentKeyDown}>
        <div className="search_suggestions_list" id="searchSuggestionsList">
          <Scrollbars autoHeight autoHeightMin={0} autoHeightMax={397} style={{ border: 'none' }} ref="scrollbars">
            <ul id="searchSuggestionsList">
              {this.state.searchResults.map(this.renderItem)}
            </ul>
          </Scrollbars>
        </div>
        <div className="search_suggestions_content" id="searchSuggestionsContent" onKeyDown={this.handleContentKeyDown} onScroll={this.handleContentScroll} tabIndex="0">
          {this.getIntegrationComponent(selectedItem).content()}
          {this.getActionButtons(selectedItem)}
        </div>
      </div>
    );
  }

  /*
  getIntegrationActions() {
    if (this.state.activeIntegration == 'gdrive'){
      return (
        <div className="search_integration_actions">
          <div className="action_link" id="doc" onClick={this.handleIntegrationActionClick}><span className="glyphicons glyphicons-plus"></span>New doc</div>
          <div className="action_link" id="sheet" onClick={this.handleIntegrationActionClick}><span className="glyphicons glyphicons-plus"></span>New sheet</div>
          <div className="action_link" id="slide" onClick={this.handleIntegrationActionClick}><span className="glyphicons glyphicons-plus"></span>New presentation</div>
        </div>
      );
    }
    else if (this.state.activeIntegration == 'jira'){
      return (
        <div className="search_integration_actions">
          <div className="action_link" id="jira-issue" onClick={this.handleIntegrationActionClick}><span className="glyphicons glyphicons-plus"></span>New issue</div>
        </div>
      );
    }
  }
*/
  renderEmptyResults() {
    const emptyString = this.state.noResultsYet ? '' : 'Sorry, your search does not match any items.';

    return (
      <div className="search_suggestions" id="searchSuggestions" onKeyUp={this.handleKeyUp} onKeyDown={this.handleContentKeyDown}>
        <div className="search_suggestions_list" id="searchSuggestionsList">
          <div className="empty_results_set">{emptyString}</div>
        </div>
        <div className="search_suggestions_content" id="searchSuggestionsContent" tabIndex="0">
        </div>
      </div>
    );
  }

  getIntegrationComponent(item) {
    // This function is meant to be used anytime there is integration dependent rendering
    // (to avoid if statements every time we need to do something gdrive/intercom/etc specific).
    let content = () => null;
    let itemStatus = () => null;

    if (item) {
      if (item.type === 'gdrive') {
        content = () => (<GdriveContent openExternalLink={this.openExternalLink} item={item} />);
        if (item.metaInfo && item.metaInfo.path && item.metaInfo.path.length > 0) {
          itemStatus = () => (
            <div className="meta_group">
              <div className="meta_icon glyphicons glyphicons-folder-open"></div>
              <div className="meta_data text_overflow" dangerouslySetInnerHTML={{ __html: item.metaInfo.path }} />
            </div>
          );
        }
      } else if (item.type === 'local-file' || item.type === 'local-folder') {
        content = () => (<LocalFileContent item={item} />);
        if (item.metaInfo && item.metaInfo.path) {
          itemStatus = () => (
            <div className="meta_group">
              <div className="meta_icon glyphicons glyphicons-folder-open"></div>
              <div className="meta_data text_overflow" dangerouslySetInnerHTML={{ __html: item.metaInfo.path }} />
            </div>
          );
        }
      } else if (item.type === 'intercom') {
        content = () => (<IntercomContent openExternalLink={this.openExternalLink} item={item} />);
        if (item.metaInfo && item.content.conversationsCount > 0) {
          itemStatus = () => (
            <div className="meta_group">
              <div className="meta_icon glyphicons glyphicons-conversation"></div>
              <div className="meta_data text_overflow" dangerouslySetInnerHTML={{ __html: item.metaInfo.status }} />
            </div>
          );
        }
      } else if (item.type === 'pipedrive') {
        content = () => (<PipedriveContent openExternalLink={this.openExternalLink} item={item} />);
        if (item.metaInfo) {
          itemStatus = () => (
            <div className="meta_group">
              <div className="meta_icon glyphicons glyphicons-flag"></div>
              <div className="meta_data text_overflow"  dangerouslySetInnerHTML={{ __html: `${item.metaInfo.status}&nbsp;/&nbsp;${item.metaInfo.stage}` }} />
            </div>
          );
        }
      } else if (item.type === 'helpscout') {
        content = () => (<HelpscoutContent openExternalLink={this.openExternalLink} item={item} />);
        if (item.metaInfo) {
          itemStatus = () => (
            <div className="meta_group">
              <div className="meta_icon glyphicons glyphicons-flag"></div>
              <div className="meta_data text_overflow" dangerouslySetInnerHTML={{ __html: `${item.metaInfo.mailbox}:&nbsp;${this.helpscoutRenderAssigned(item.metaInfo.assigned, item.metaInfo.status)}${item.metaInfo.status}` }} />
            </div>
          );
        }
      } else if (item.type === 'helpscout-docs') {
        content = () => (<HelpscoutDocsContent openExternalLink={this.openExternalLink} item={item} />);
        if (item.metaInfo) {
          itemStatus = () => (
            <div className="meta_group">
              <div className="meta_icon glyphicons glyphicons-folder-open"></div>
              <div className="meta_data text_overflow" dangerouslySetInnerHTML={{ __html: item.metaInfo.status }} />
            </div>
          );
        }
      } else if (item.type === 'jira') {
        content = () => (<JiraContent openExternalLink={this.openExternalLink} item={item} />);
        if (item.metaInfo) {
          itemStatus = () => (
            <div className="meta_group">
              <div className="meta_icon glyphicons glyphicons-folder-open"></div>
              <div className="meta_data text_overflow" dangerouslySetInnerHTML={{ __html: item.metaInfo.status }} />
            </div>
          );
        }
      } else if (item.type === 'github-repo') {
        content = () => (<GithubRepoContent openExternalLink={this.openExternalLink} item={item} />);
        if (item.metaInfo) {
          itemStatus = () => (
            <div className="meta_group">
              <div className="meta_icon glyphicons glyphicons-folder-open"></div>
              <div className="meta_data text_overflow" dangerouslySetInnerHTML={{ __html: item.metaInfo.status }} />
            </div>
          );
        }
      } else if (item.type === 'github-commit') {
        content = () => (<GithubCommitContent openExternalLink={this.openExternalLink} item={item} />);
        if (item.metaInfo) {
          itemStatus = () => (
            <div className="meta_group">
              <div className="meta_icon glyphicons glyphicons-folder-open"></div>
              <div className="meta_data text_overflow" dangerouslySetInnerHTML={{ __html: item.metaInfo.status }} />
            </div>
          );
        }
      } else if (item.type === 'github-file') {
        content = () => (<GithubFileContent openExternalLink={this.openExternalLink} item={item} />);
        if (item.metaInfo) {
          itemStatus = () => (
            <div className="meta_group">
              <div className="meta_icon glyphicons glyphicons-folder-open"></div>
              <div className="meta_data text_overflow" dangerouslySetInnerHTML={{ __html: item.metaInfo.status }} />
            </div>
          );
        }
      } else if (item.type === 'github-issue') {
        content = () => (<GithubIssueContent openExternalLink={this.openExternalLink} item={item} />);
        if (item.metaInfo) {
          itemStatus = () => (
            <div className="meta_group">
              <div className="meta_icon glyphicons glyphicons-folder-open"></div>
              <div className="meta_data text_overflow" dangerouslySetInnerHTML={{ __html: item.metaInfo.status }} />
            </div>
          );
        }
      } else if (item.type === 'currency') {
        content = () => (<CurrencyContent item={item} />);
      }
    }

    return { content, itemStatus };
  }

  getActionButtons(item) {
    if (item.webLink && item.type === 'local-file') {
      return (
        <div className="content_bottom_view_link">
          <div className="content_center">
            <div className="action_link" onClick={this.handleLocalAppPreview}><span className="glyphicons glyphicons-search"></span>Preview</div>
            <div className="action_link" onClick={this.handleLocalAppInFinder}><span className="glyphicons glyphicons-folder-open"></span>Open in Finder</div>
            <div className="action_link" onClick={this.handleExternalLink}><span className="glyphicons glyphicons-new-window"></span>Open</div>
          </div>
        </div>
      ); 
    }
    if (item.webLink) {
      return (
        <div className="content_bottom_view_link">
          <div className="content_center">
            <div className="action_link" onClick={this.handleExternalLink}><span className="glyphicons glyphicons-new-window"></span>Open</div>
            <div className="action_link" onClick={this.handleActionIconLinkClick}><span className="glyphicons glyphicons-link"></span>Copy Link to Clipboard</div>
          </div>
        </div>
      );
    }
    else {
      return (
        <div className="content_bottom_view_link">
          <div className="content_center">
            <div className="action_link" onClick={this.copyValueToClipboard}><span className="glyphicons glyphicons-more-items"></span>Copy to Clipboard</div>
          </div>
        </div>
      );
    }
  }

  helpscoutRenderAssigned(assigned, status) {
    status = status.toLowerCase();
    if (status == 'active' || status == 'pending'){
      return assigned + '&nbsp;/&nbsp;';
    }
    else 
      return '';
  }

  handleSidebarIntegrationClick(integration) {
    this.refs.searchBar.setText(integration);
  }

  handleAddIntegrationsClick() {
    ipcRenderer.send('account');
  }

  render() {
    const open = this.state.searchResults.length > 0;
    return (
      <div className="main_app">
        <SideBar
          className = {"sidebar"}
          id = "sideBar"
          ref = "sideBar"
          onIntegrationClick = {this.handleSidebarIntegrationClick}
          onSettingsClick = {this.handleSettingsClick}
          integrations = {this.state.integrations}
          icons = {icons}
        />
        <div className = "search_root">
          <SearchBar
            onKeyUp = {this.handleKeyUp}
            onKeyDown = {this.handleKeyDown}
            onInput = {this.handleInput}
            onDragEnd = {this.handleDragEnd}
            className = {"search_bar_open"}
            id = "searchBar"
            ref = "searchBar"
            selectedIndex = {this.state.selectedIndex}
            clearInput = {this.state.clearInput}
            searchError = {this.state.searchError}
          />
          {open ? this.renderSearchResults() : this.renderEmptyResults()}
        </div>
      </div>
    );
  }
}
