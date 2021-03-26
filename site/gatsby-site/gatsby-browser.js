import wrapWithProvider from './wrap-with-provider';

export const wrapRootElement = wrapWithProvider;
export const onServiceWorkerUpdateReady = () => {
  const answer = window.confirm(
    `This website has been updated. ` + `Reload to display the latest version?`
  );

  if (answer === true) {
    window.location.reload();
  }
};

import 'bootstrap/dist/css/bootstrap.css';
