import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux'; 
import { store, persistor } from './store/store';
import apiClient from './api/apiClient';
import { PersistGate } from 'redux-persist/integration/react';


const onBeforeLift = () => {
  const jwtToken = store.getState().token.token;
  if(jwtToken){
    apiClient.defaults.headers.common['authorization'] = jwtToken;
    console.log('토큰 설정 완료');
  }
};
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor} onBeforeLift={onBeforeLift}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PersistGate>
  </Provider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
