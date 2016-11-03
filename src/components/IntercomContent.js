import React, {Component} from 'react';
import ReactDOM from 'react-dom';

export default class IntercomContent extends Component {
  constructor(props){
    super();
  }

  renderEvents(events) {
    if (!events) {
      return null;
    }

    return (
      <div className="content_section_text">
        {events.map((e, i) => (
          <div className="content_row content_row_list" key={`eventRow_${i}`}>
            <div className="content_list_value" dangerouslySetInnerHTML={{ __html: e.name }} />
            <div className="content_list_right_side">{e.time}</div>
          </div>
        ))}
      </div>
    );
  }

  renderConversations(userId, conversations) {
    console.log(conversations);
    if (!conversations || conversations.length == 0) {
      return null;
    }
    return (
      <div>
        <div className="content_section_title">Conversations</div>
        <div className="content_section_text section_intercom_conversations">
          {conversations.map((c, i) => (
            <div className={i === 0 ? "conversation_first" : "conversation"} key={`conversation_${i}`}>
              <div className="status">{c.open ? "Status: Open" : "Status: Closed" }</div>
              {c.items.map((item, k) => (
                <div className="conversation_item" key={`conversationItem_${k}`}>
                  <div className={userId === item.authorId ? "message_owner" : "message"} dangerouslySetInnerHTML={{ __html: item.body }} />
                  <div className="conversation_metaInfo">
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
            <div className="content_attribute_name">Company</div>
            <div className="content_attribute_value">{this.renderAttribute(item.content.company)}</div>
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
            <div className="content_attribute_value">{this.renderAttribute(item.content.segments)}</div>
          </div>          
        </div>

        <div className="content_section_title">Latest events</div>
        {this.renderEvents(item.content.events)}
        
        {this.renderConversations(item.userId, item.content.conversations)}

      </div>
    )
  }
}
