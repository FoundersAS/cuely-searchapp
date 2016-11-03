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
      <div className="section_intercom">
      {events.map((e, i) => (
        <div className="row" key={`event_${i}`}>
          <div className="big_cell" dangerouslySetInnerHTML={{ __html: e.name }} />
          <div className="small_cell">{e.time}</div>
        </div>
      ))}
      </div>
    );
  }

  renderConversations(userId, conversations) {
    if (!conversations) {
      return null;
    }
    return (
      <div className="section_intercom_conversations">
        {conversations.map((c, i) => (
          <div className={i === 0 ? "conversation_first" : "conversation"} key={`conversation_${i}`}>
            <div className="status">{c.open ? "Open" : "Closed" }</div>
            {c.items.map((item, k) => (
              <div className="conversation_item" key={`conversationItem_${k}`}>
                <div className={userId === item.authorId ? "message_owner" : "message"} dangerouslySetInnerHTML={{ __html: item.body }} />
                <div className="author" dangerouslySetInnerHTML={{ __html: item.author }} /> | <div className="time">{item.time}</div>
              </div>
            ))}
          </div>
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
        <div className="title_intercom">User info</div>
        <div className="section_intercom">
          <div className="row">
            <div className="small_cell">Revenue</div>
            <div className="big_cell">${item.content.monthlySpend}/month</div>
          </div>
          <div className="row">
            <div className="small_cell">Plan</div>
            <div className="big_cell">{item.content.plan}</div>
          </div>
          <div className="row">
            <div className="small_cell">Web sessions</div>
            <div className="big_cell">{item.content.sessions}</div>
          </div>
          <div className="row">
            <div className="small_cell">Conversations</div>
            <div className="big_cell">{item.content.conversationsCount}</div>
          </div>
          <div className="row">
            <div className="small_cell">Segments</div>
            <div className="big_cell">{item.content.segments}</div>
          </div>          
        </div>

        <div className="title_intercom">Latest activity</div>
        {this.renderEvents(item.content.events)}
        
        <div className="title_intercom">Conversations</div>
        {this.renderConversations(item.userId, item.content.conversations)}
      </div>
    )
  }
}
