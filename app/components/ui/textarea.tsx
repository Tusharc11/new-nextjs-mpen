// FILE: src/app/components/ui/textarea.tsx

import * as React from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
    <textarea
        ref={ref}
        className={`border rounded p-2 ${className}`}
        {...props}
    />
));

Textarea.displayName = "Textarea";

export { Textarea };