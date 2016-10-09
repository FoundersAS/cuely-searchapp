import 'babel-polyfill'; // generators
import React from 'react';
import ReactDOM from 'react-dom';

const render = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const Component = urlParams.has('login') ?
                    require('./login.js').default :
                    require('./app.js').default;
  ReactDOM.render(<Component />, document.getElementById('app'));
};

render();

if (module.hot) {
  module.hot.accept('.', function() {
    render();
  });
}
