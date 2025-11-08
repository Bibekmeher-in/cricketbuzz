import React from 'react';

export default function Loader({ size = 'md', message = '', centered = false }) {
    const sizeMap = {
        sm: 'w-6 h-6 border-2',
        md: 'w-8 h-8 border-2.5',
        lg: 'w-10 h-10 border-3',
    };
    const classes = sizeMap[size] || sizeMap.md;

    const content = (
        <div className="flex items-center gap-3">
            <div className={`rounded-full border-t-slate-700 border-slate-200 border-solid animate-spin ${classes}`}></div>
            {message && <div className="text-sm text-slate-600">{message}</div>}
        </div>
    );
    return centered ? (
        <div className=' w-full flex items-center justify-center p-4'>{content}</div> 
) : (
        centered
    );
}