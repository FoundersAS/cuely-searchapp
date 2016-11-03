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
        <div className="row" key={`eventRow_${i}`}>
          <div className="big_cell" dangerouslySetInnerHTML={{ __html: e.name }} />
          <div className="small_cell">{e.time}</div>
        </div>
      ))}
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
      </div>
    )
  }
}
