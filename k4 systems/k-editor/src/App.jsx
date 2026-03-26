
import { useEffect, useRef, useState } from 'react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';

function App() {
  const editorRef = useRef(null);
  const [html, setHtml] = useState('');
  const grapesRef = useRef(null);

  useEffect(() => {
    if (!grapesRef.current) {
      grapesRef.current = grapesjs.init({
        container: editorRef.current,
        height: '500px',
        width: '100%',
        fromElement: false,
        storageManager: false,
        plugins: [],
        canvas: {
          styles: [
            'https://unpkg.com/normalize.css@8.0.1/normalize.css',
          ],
        },
      });
      // Adiciona um bloco editável inicial ao body
      grapesRef.current.setComponents('<div style="min-height:100px;outline:1px dashed #aaa;padding:10px;">Digite seu conteúdo aqui...</div>');
      // Seleciona o bloco inicial para edição imediata
      setTimeout(() => {
        const comps = grapesRef.current.getWrapper().components();
        if (comps.length > 0) {
          grapesRef.current.select(comps.at(0));
        }
      }, 500);
    }
    return () => {
      if (grapesRef.current) {
        grapesRef.current.destroy();
        grapesRef.current = null;
      }
    };
  }, []);

  const handleExport = () => {
    if (grapesRef.current) {
      // Gera HTML limpo
      const html = grapesRef.current.getHtml();
      setHtml(html);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Editor Visual (HTML Limpo)</h1>
      <div ref={editorRef} style={{ border: '1px solid #ccc', marginBottom: 20 }} />
      <button onClick={handleExport} style={{ marginBottom: 20 }}>Exportar HTML Limpo</button>
      <h2>HTML Gerado:</h2>
      <pre style={{ background: '#f4f4f4', padding: 10, minHeight: 100 }}>{html}</pre>
    </div>
  );
}

export default App;
