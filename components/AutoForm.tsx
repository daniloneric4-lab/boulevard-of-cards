'use client';

/** Forma sa filterima: izbor u padajućem meniju se primenjuje odmah, cene na Enter ili „Primeni”. */
export default function AutoForm(props: React.FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form
      {...props}
      onChange={(e) => {
        if ((e.target as HTMLElement).tagName === 'SELECT') e.currentTarget.requestSubmit();
      }}
    />
  );
}
