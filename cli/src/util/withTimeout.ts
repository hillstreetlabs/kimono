export default <T>(promise: Promise<T>, timeout: number): Promise<T> => {
  return new Promise((resolve, reject) => {
    let timer = setTimeout(
      () => reject(`Timeout of ${timeout}ms exceeded`),
      timeout
    );
    promise
      .then((...args: any[]) => {
        if (timer) {
          clearTimeout(timer);
          resolve(...args);
        }
      })
      .catch((...args: any[]) => {
        if (timer) {
          clearTimeout(timer);
          reject(...args);
        }
      });
  });
};
