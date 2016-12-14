import React, {Component} from 'react';
import ReactDOM from 'react-dom';

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
    type: 'find',
    spriteOffset: 21
  },
  {
    type: 'gdrive',
    spriteOffset: 22
  }
]

export default class SideBar extends Component {
  constructor(props){
    super();
    this.handleIntegrationClick = ::this.handleIntegrationClick;
    this.state = {
      active : 'cuely',
      currentIntegrations : []
    }
  }

  componentDidMount() {

  }

  componentDidUpdate() {
  }

  componentWillReceiveProps(nextProps){
    this.setState ({
      currentIntegrations : this.fixIntegrations(nextProps.integrations)
    });
  }

  fixIntegrations(integrations) {
    let integrat = [];

    for (let integration of integrations){
      if (integration == 'google') {
        integrat.push('gdrive');
      }
      else {
        integrat.push(integration);
      }
    }

    integrat.unshift('find');

    return integrat;
  }


  getIconStyle(mime) {
    let displayIcon = {
      'style': 'sidebar_integration_logo'
    };
    
    let item = {};

    for (let itemIcons of icons){
      if (itemIcons.type == mime) {
        const verticalOffset = itemIcons.spriteOffset*(-27) + 'px';

        displayIcon.inlineStyle = { 'backgroundPosition': '0 ' + verticalOffset };
        displayIcon.style = displayIcon.style + ' ' + 'search_suggestions_logo_sprite';

        return (displayIcon);
      }
    }

    return (displayIcon);
  }

  handleIntegrationClick(e) {
    this.setState({
      active : e.target.id
    });

    if (e.target.id != 'cuely') {
      this.props.onIntegrationClick(e.target.id + ' ');
    }
    else {
      this.props.onIntegrationClick('');
    }
    
  }

  renderIntegrationItem(integration) {
    const icon = this.getIconStyle(integration);
    const liActive = (integration == this.state.active) ? 'active' : '';

    return (
      <li id={integration} className={liActive} onClick={this.handleIntegrationClick}>
        <div id={integration} style={icon.inlineStyle} className={icon.style} />
      </li>
    );
  }

  render() {
    let integrations = [];

    for (let integration of this.state.currentIntegrations) {
      integrations.push(this.renderIntegrationItem(integration));
    }

    return (
      <div className={this.props.className} id={this.props.id}>
        <ul>
          {this.renderIntegrationItem('cuely')}
        </ul>
        <ul>
          {integrations}
        </ul>
      </div>
    );
  }
}
