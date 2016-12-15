import React, {Component} from 'react';
import ReactDOM from 'react-dom';

export default class SideBar extends Component {
  constructor(props){
    super();
    this.handleIntegrationClick = ::this.handleIntegrationClick;
    this.state = {
      active: 'cuely',
      currentIntegrations: new Set(),
      icons: props.icons
    }
  }

  componentDidMount() {

  }

  componentDidUpdate() {
  }

  componentWillReceiveProps(nextProps){
    this.setState ({
      currentIntegrations: this.fixIntegrations(nextProps.integrations),
    });
  }

  fixIntegrations(integrations) {
    let sidebarIntegrations = new Set();

    sidebarIntegrations.add('mac');
    for (let integration of integrations){
      if (integration == 'google') {
        sidebarIntegrations.add('gdrive');
      } else if (integration == 'helpscout-docs') {
        sidebarIntegrations.add('helpscout');
      } else {
        sidebarIntegrations.add(integration);
      }
    }

    sidebarIntegrations.add('gmail');
    sidebarIntegrations.add('gcal');
    sidebarIntegrations.add('google');

    return sidebarIntegrations;
  }


  getIconStyle(mime) {
    let displayIcon = {
      'style': 'sidebar_integration_logo'
    };
    
    let item = {};

    for (let itemIcons of this.state.icons) {
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
    } else {
      this.props.onIntegrationClick('');
    } 
  }

  changeIcon(query) {
    let words = query.toLowerCase().split(' ');
    let activeIntegration = 'cuely';

    for (let integration of this.state.currentIntegrations) {
      if (integration === words[0]) {
        activeIntegration = integration;
      }
    }

    if (this.state.active != activeIntegration) {
      this.setState({
        active : activeIntegration
      });
    }
  }

  renderIntegrationItem(integration) {
    const icon = this.getIconStyle(integration);
    const liActive = (integration == this.state.active) ? 'active' : '';

    return (
      <li id={integration} className={liActive} onClick={this.handleIntegrationClick} key={`li_${integration}`}>
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
      <div>
        <div className={this.props.className} id={this.props.id}>
          <ul>
            {this.renderIntegrationItem('cuely')}
          </ul>
          <ul>
            {integrations}
          </ul>
        </div>
        <div className='sidebar_bottom' onClick={this.props.addIntegrationsClick}>
        +
        </div>
      </div>
    );
  }
}
