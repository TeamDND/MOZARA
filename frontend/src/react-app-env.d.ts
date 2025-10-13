/// <reference types="react-scripts" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly REACT_APP_API_BASE_URL: string;
    readonly REACT_APP_PYTHON_API_URL: string;
    readonly REACT_APP_OPENWEATHER_API_KEY: string;
  }
}
