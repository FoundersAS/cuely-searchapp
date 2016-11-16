import React, {Component} from 'react';
import ReactDOM from 'react-dom';

export default class IntercomContent extends Component {
  constructor(props) {
    super();
    this.handleClick = ::this.handleClick
  }

  handleClick(e) {
    e.preventDefault();
    // get actual <a> tag
    let el = e.target;
    while(el.nodeName !== 'A') {
      el = el.parentElement;
      if (el.className === 'content_section_text' || el.nodeName === 'BODY') {
        // oops, no anchor tag found
        return;
      }
    }
    this.props.openExternalLink(el.href, 'clicked Intercom segment link');
  }

  renderEvents(events) {
    if (!events) {
      return null;
    }

    return (
      <div className="content_section_text">
        {events.map((e, i) => (
          <div className="content_row style_space_between" key={`eventRow_${i}`}>
            <div className="content_list_value" dangerouslySetInnerHTML={{ __html: e.name }} />
            <div className="content_list_right_side">{e.time}</div>
          </div>
        ))}
      </div>
    );
  }

  renderConversations(userId, conversations) {
    if (!conversations || conversations.length == 0) {
      return null;
    }
    return (
      <div>
        <div className="content_section_title">Conversations</div>
        <div className="content_section_text content_section_conversation">
          {conversations.map((c, i) => (
            <div className={i === 0 ? "conversation_first" : "conversation"} key={`conversation_${i}`}>
              <div className="status">{c.open ? "Conversation status: Open" : "Conversation status: Closed" }</div>
              {c.items.map((item, k) => (
                <div className="conversation_item" key={`conversationItem_${k}`}>
                  <div className={userId === item.authorId ? "message message_owner" : "message"} dangerouslySetInnerHTML={{ __html: item.body }} />
                  <div className="conversation_meta style_space_between">
                    <div className="author" dangerouslySetInnerHTML={{ __html: item.author }} /><div className="time">&nbsp;{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  renderAttribute(attr) {
    return (attr ? attr : '/');
  }

  renderAttributeSpend(attr) {
    return (attr ? '$'+ attr + '/month' : '/');
  }

  renderSegments(content) {
    if (!content.newSegments || content.newSegments.length < 1) {
      return (<div className="content_attribute_value"  dangerouslySetInnerHTML={{ __html: content.segments || '/' }} />);
    }
    return (
      <div className="content_attribute_value">
        {content.newSegments.map((s, i) => (
          <span>
            <a key={`segment_link_${i}`} className="content_link" href={s.link} onClick={this.handleClick}><span dangerouslySetInnerHTML={{ __html: s.name }} /></a>
            {i < content.newSegments.length - 1 ? ', ': null}
          </span>
        ))}
      </div>
    );
  }

  render() {
    const item = this.props.item;
    if (!item) {
      return null;
    }
    return (
      <div>
        <div className="content_section_title">User info</div>
        <div className="content_section_text">
          <div className="content_row">
            <div className="content_attribute_name">Email</div>
            <div className="content_attribute_value" dangerouslySetInnerHTML={{ __html: item.content.email || '/' }} />
          </div>
          <div className="content_row">
            <div className="content_attribute_name">Company</div>
            <div className="content_attribute_value" dangerouslySetInnerHTML={{ __html: item.content.company || '/' }} />
          </div>
          <div className="content_row">
            <div className="content_attribute_name">Revenue</div>
            <div className="content_attribute_value">{this.renderAttributeSpend(item.content.monthlySpend)}</div>
          </div>
          <div className="content_row">
            <div className="content_attribute_name">Plan</div>
            <div className="content_attribute_value">{this.renderAttribute(item.content.plan)}</div>
          </div>
          <div className="content_row">
            <div className="content_attribute_name">Web sessions</div>
            <div className="content_attribute_value">{this.renderAttribute(item.content.sessions)}</div>
          </div>
          <div className="content_row">
            <div className="content_attribute_name">Conversations</div>
            <div className="content_attribute_value">{this.renderAttribute(item.content.conversationsCount)}</div>
          </div>
          <div className="content_row">
            <div className="content_attribute_name">Segments</div>
            {this.renderSegments(item.content)}
          </div>          
        </div>

        <div className="content_section_title">Latest events</div>
        {this.renderEvents(item.content.events)}
        
        {this.renderConversations(item.userId, item.content.conversations)}

      </div>
    )
  }
}
