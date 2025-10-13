import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Tailwind CSS import 추가
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux'; 
import { store, persistor } from './utils/store';
import apiClient from './services/apiClient';
import { PersistGate } from 'redux-persist/integration/react';

// TypeScript: 함수 타입 정의
const onBeforeLift = (): void => {
  const jwtToken = store.getState().token.token;
  if(jwtToken){
    apiClient.defaults.headers.common['authorization'] = jwtToken;
  }
};

// TypeScript: DOM 요소 타입 지정
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor} onBeforeLift={onBeforeLift}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);

// Performance monitoring can be added here if needed

