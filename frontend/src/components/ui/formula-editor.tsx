import React from "react";
import { EditorView, useCodeMirror } from "@uiw/react-codemirror";
import { spreadsheet } from "codemirror-lang-spreadsheet";

interface FormulaEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  [key: string]: unknown;
}

export const FormulaEditor = function ({
  value,
  onChange,
  onBlur,
}: FormulaEditorProps) {
  const editor = React.useRef(null);
  const extensions = [
    spreadsheet(),
    EditorView.updateListener.of(function (e) {
      if (e.docChanged) {
        onChange(e.state.doc.toString());
      }
      console.log(e);
    }),
  ];

  const { view, setContainer } = useCodeMirror({
    container: editor.current,
    extensions,
    value,
  });

  React.useEffect(() => {
    if (editor.current) {
      setContainer(editor.current);
      if (view) {
        view.setTabFocusMode(true);
        view.focus();
      }
    }
  }, [editor.current, view]);

  return <div ref={editor} onBlur={onBlur} />;
};
