import React, {Component} from 'react';
import ReactDOM from 'react-dom';


export default class CurrencyContent extends Component {
  constructor(props) {
    super();
  }

  render() {
    const item = this.props.item;
    if (!item) {
      return null;
    }
    return (
      <div>
        <div className='content_section'>
          <div className="content_section_title">Rates</div>
          <div className="content_section_text">
            {item.content.map((rate, i) => (
              <div className="content_row style_space_between" key={`currency_rate_${i}`}>
                <div className="content_currency_value">{rate.value}</div>
                <div className="content_currency_name">{rate.currency}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
}
