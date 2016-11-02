import React, {Component} from 'react';
import ReactDOM from 'react-dom';

export default class IntercomContent extends Component {
  constructor(props){
    super();
  }

  render() {
    if (!this.props.item) {
      return null;
    }
    const item = this.props.item;
    return (
      <div>INTERCOM DATA</div>
    )
  }
}
