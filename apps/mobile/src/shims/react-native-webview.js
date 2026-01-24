import React, {useRef, useEffect} from 'react';

export function WebView(props) {
  const {source, style, onMessage, onLoad} = props;
  const src = source && source.html
    ? 'data:text/html;charset=utf-8,' + encodeURIComponent(source.html)
    : source && source.uri
    ? source.uri
    : 'about:blank';

  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (onMessage) {
        onMessage({nativeEvent: {data: e.data}});
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onMessage]);

  return (
    <iframe
      ref={ref}
      src={src}
      style={{border: 0, width: '100%', height: '100%', ...(style || {})}}
      onLoad={onLoad}
      title="WebView"
    />
  );
}

export default {WebView};
