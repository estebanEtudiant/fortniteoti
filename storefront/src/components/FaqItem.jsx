import React, { useState } from 'react';

export default function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item">
      <button className="faq-question" onClick={() => setOpen(!open)}>
        <span>{question}</span>
        <span className={`faq-toggle ${open ? 'open' : ''}`}>&#9660;</span>
      </button>
      {open && <div className="faq-answer">{answer}</div>}
    </div>
  );
}
