import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import showdown from 'showdown';

const converter = new showdown.Converter();

export default class GdriveContent extends Component {
  constructor(props){
    super();
    this.fixLinks = ::this.fixLinks;
    this.linkify = ::this.linkify;
    this.checkProtocol = ::this.checkProtocol;
    this.newLineRemover = ::this.newLineRemover;
    this.openLink = ::this.openLink;
  }

  componentDidUpdate() {
    for (let itemLink of document.getElementsByClassName("content_link")){
      itemLink.addEventListener("click", this.openLink, false);
    }
  }

  renderRow(row, i) {
    let cells = [];
    for (let k=0;k < row.length;k++) {
      if (i === -1) {
        cells.push(<th key={`tableHeader_${k}`} dangerouslySetInnerHTML={{ __html: row[k] }}></th>);
      } else {
        cells.push(<td key={`tableCell${i}_${k}`} dangerouslySetInnerHTML={{ __html: row[k] }}></td>);
      }
    }

    return (
      <tr key={`tableRow${i}`}>
        {cells}
      </tr>
    )
  }

  renderContentValue(content) {
    if (content instanceof Array) {
      return (
        <table id="searchSuggestionsContentTable">
          <thead>
            {this.renderRow(content[0], -1)}
          </thead>
          <tbody>
            {content.slice(1).map(this.renderRow)}
          </tbody>
        </table>
      )
    }
    else if (typeof(content) === 'string'){
      content = this.linkify(content); 
      content = converter.makeHtml(content);
      content = this.newLineRemover(content);
    }
    return (
      <pre id="searchSuggestionsContentPre" dangerouslySetInnerHTML={{ __html: content }} />
    )
  }

  render() {
    if (!this.props.item) {
      return null;
    }
    const item = this.props.item;
    if (!item.content) {
      return (
        <div>
          <div className="title_drive">contents</div>
          <div className="no_preview">No preview available.</div>
        </div>
      )
    } else if (item.metaInfo.users.length > 1) {
      return (
        <div>
          <div className="title_drive">Co-authors</div>
          <div className="avatars">
            {item.metaInfo.users.map(user => (
                    user.avatar ? <div key={`avatar_${i}_${user.name}`} style={{ backgroundImage: 'url(' + user.avatar + ')' }} className={user.nameHighlight ? "avatar active" : "avatar"} />
                                : <div key={`avatar_${i}_${user.name}`} className={user.nameHighlight ? "avatar no_avatar active" : "avatar no_avatar"}>{this.initials(user.name)}</div>))}
          </div>
          <div className="title_drive">contents</div>
          {this.renderContentValue(item.content)}
        </div>
      )
    }
    else {
      return (
        <div>
          <div className="title_drive">contents</div>
          {this.renderContentValue(item.content)}
        </div>
      )
    }
  }
  
  // ---- UTILITIES
  initials(username) {
    return username.split(' ').map(x => x[0]).slice(0, 2).join('');
  }

  linkify(text) {
    const urlFullRegex =/(www.)?[-A-Za-z0-9+&@#\/%=~_|]*(<em class="algolia_highlight">)[-A-Za-z0-9+&@#\/%=~_|]*(<\/em>)[-A-Za-z0-9+&@#\/%=~_|]*[.](com|net|me|io|org|edu|co|dk|de)|(\b(https?|ftp|file):\/\/[-A-Za-z0-9+&@#\/%?=~_|!:,.;]*(<em class="algolia_highlight">)[-A-Za-z0-9+&@#\/%?=~_|!:,.;]*(<\/em>)[-A-Za-z0-9+&@#\/%?=~_|!:,.;]*)|(\b(https?|ftp|file):\/\/[-A-Za-z0-9+&@#\/%?=~_|!:,.;]*[-A-Za-z0-9+&@#\/%=~_|]|(www.)?[-A-Za-z0-9+&@#\/%=~_|]+[.](com|net|me|io|org|edu|co|dk|de))/ig;

    return text.replace(urlFullRegex, this.fixLinks);
  }

  fixLinks(url) {
    const urlEmRegex = /(www.)?[-A-Za-z0-9+&@#\/%=~_|]*(<em class="algolia_highlight">)[-A-Za-z0-9+&@#\/%=~_|]*(<\/em>)[-A-Za-z0-9+&@#\/%=~_|]*[.](com|net|me|io|org|edu|co|dk|de)|(\b(https?|ftp|file):\/\/[-A-Za-z0-9+&@#\/%?=~_|!:,.;]*(<em class="algolia_highlight">)[-A-Za-z0-9+&@#\/%?=~_|!:,.;]*(<\/em>)[-A-Za-z0-9+&@#\/%?=~_|!:,.;]*)/;

    if (urlEmRegex.test(url)){
      let first_part = url.split('<em class="algolia_highlight">')[0];
      let second_part = url.split('<em class="algolia_highlight">')[1].split('</em>')[0];
      let third_part = url.split('<em class="algolia_highlight">')[1].split('</em>')[1];

      return '<a href="' + this.checkProtocol(first_part) + second_part + third_part + '" class="content_link">' + url + '</a>';
    }
    else {
      return '<a href="' + this.checkProtocol(url) + '" class="content_link">' + url + '</a>';
    }
  }

  checkProtocol(url){
    var urlProtocolRegex =/(\b(https?|ftp|file):\/\/)/;

    if (!urlProtocolRegex.test(url)) {
      return 'http://' + url;
    }
    else {
      return url;
    }
  }

  newLineRemover(text) {
    var urlRegex = /(\n\n)|\r?\n|\r/g;
    var urlRegexPar = /((<p>)[\s\S]*?(<\/p>))/g;

    text = text.replace(urlRegexPar, line => {
      return line.replace(/\r?\n|\r/g, () => {
        return '<br>';
      });
    });

    return text.replace(urlRegex, line => {
      return '';
    });
  }

  openLink(e) {
    e.preventDefault();
    this.props.openExternalLink(e.target.href, 'clicked link in content text');
  }
}
