import React, {Component} from 'react';
import ReactDOM from 'react-dom';

export default class PipedriveContent extends Component {
  constructor(props) {
    super();
    this.openLink = ::this.openLink;
  }

  componentDidMount() {
    // force didUpdate on initial rendering
    this.componentDidUpdate();
  }

  componentDidUpdate() {
    for (let itemLink of document.getElementsByClassName("content_link")) {
      itemLink.addEventListener("click", this.openLink, false);
    }
  }

  openLink(e) {
    e.preventDefault();
    console.log(e);
    // get actual <a> tag
    let el = e.target;
    while(el.nodeName !== 'A') {
      el = el.parentElement;
      if (el.className === 'content_section_text') {
        // oops, no anchor tag found
        return;
      }
    }
    this.props.openExternalLink(el.href, 'clicked Pipedrive contact/user link');
  }

  renderAttribute(attr) {
    return (attr ? attr : '/');
  }

  renderAttributeValue(value, currency) {
    return (value ? value + ' ' + currency : '/');
  }

  renderPeople(people, title, groupIndex) {
    if (!people || people.length == 0) {
      return null;
    }
    return (
      <div>
        <div className="content_section_title">{title}&nbsp;({people.length})</div>
        <div className="content_section_text">
          {people.map((p, i) => (
            <div className="content_row style_space_between" key={`peopleRow_${groupIndex}_${i}`}>
              <a href={p.url} className="content_link"><div className="content_list_value" dangerouslySetInnerHTML={{ __html: p.name }} /></a>
              <div className="content_list_right_side" dangerouslySetInnerHTML={{ __html: p.email }} />
            </div>
          ))}
        </div> 
      </div>
    )
  }

  render() {
    const item = this.props.item;
    if (!item) {
      return null;
    }
    return (
      <div>
        <div className="content_section_title">Deal info</div>
        <div className="content_section_text">
          <div className="content_row">
            <div className="content_attribute_name">Company</div>
            <div className="content_attribute_value" dangerouslySetInnerHTML={{ __html: item.content.company }} />
          </div>
          <div className="content_row">
            <div className="content_attribute_name">Deal value</div>
            <div className="content_attribute_value">{this.renderAttributeValue(item.content.value, item.content.currency)}</div>
          </div>
          <div className="content_row">
            <div className="content_attribute_name">Status</div>
            <div className="content_attribute_value">{this.renderAttribute(item.metaInfo.status)}</div>
          </div>
          <div className="content_row">
            <div className="content_attribute_name">Stage</div>
            <div className="content_attribute_value">{this.renderAttribute(item.metaInfo.stage)}</div>
          </div>
        </div>

        {this.renderPeople(item.content.contacts, 'Associated contacts', 0)}
        {this.renderPeople(item.content.users, 'Associated users', 1)}
      </div>
    )
  }
}
