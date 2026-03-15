import React, { useEffect, useRef } from 'react';

const ContextMenu = ({ x, y, onClose, onAction, targetType, targetName }) => {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    // Adjust menu position if it goes off-screen
    const style = {
        top: `${y}px`,
        left: `${x}px`,
    };

    return (
        <div
            ref={menuRef}
            className="fixed z-50 w-64 bg-[#252526] border border-[#454545] rounded-md shadow-2xl py-1 text-[13px] text-[#cccccc] font-sans animate-scaleIn origin-top-left select-none"
            style={style}
        >
            <div
                className="hover:bg-[#094771] hover:text-white px-3 py-1.5 cursor-pointer flex justify-between items-center group transition-colors duration-100"
                onClick={() => onAction('newFile')}
            >
                <span>New File...</span>
            </div>
            <div
                className="hover:bg-[#094771] hover:text-white px-3 py-1.5 cursor-pointer flex justify-between items-center group transition-colors duration-100"
                onClick={() => onAction('newFolder')}
            >
                <span>New Folder...</span>
            </div>

            <div className="h-[1px] bg-[#454545] my-1 mx-2"></div>

            <div
                className="hover:bg-[#094771] hover:text-white px-3 py-1.5 cursor-pointer flex justify-between items-center group transition-colors duration-100"
                onClick={() => onAction('revealInFinder')}
            >
                <span>Reveal in Finder</span>
            </div>
            <div
                className="hover:bg-[#094771] hover:text-white px-3 py-1.5 cursor-pointer flex justify-between items-center group transition-colors duration-100"
                onClick={() => onAction('openInTerminal')}
            >
                <span>Open in Integrated Terminal</span>
            </div>

            <div className="h-[1px] bg-[#454545] my-1 mx-2"></div>

            <div
                className="hover:bg-[#094771] hover:text-white px-3 py-1.5 cursor-pointer flex justify-between items-center group transition-colors duration-100"
                onClick={() => onAction('cut')}
            >
                <span>Cut</span>
                <span className="text-xs text-[#999999] group-hover:text-white opacity-0 group-hover:opacity-100">Cmd+X</span>
            </div>
            <div
                className="hover:bg-[#094771] hover:text-white px-3 py-1.5 cursor-pointer flex justify-between items-center group transition-colors duration-100"
                onClick={() => onAction('copy')}
            >
                <span>Copy</span>
                <span className="text-xs text-[#999999] group-hover:text-white opacity-0 group-hover:opacity-100">Cmd+C</span>
            </div>
            <div
                className="hover:bg-[#094771] hover:text-white px-3 py-1.5 cursor-pointer flex justify-between items-center group transition-colors duration-100"
                onClick={() => onAction('paste')}
            >
                <span>Paste</span>
                <span className="text-xs text-[#999999] group-hover:text-white opacity-0 group-hover:opacity-100">Cmd+V</span>
            </div>

            <div className="h-[1px] bg-[#454545] my-1 mx-2"></div>

            <div
                className="hover:bg-[#094771] hover:text-white px-3 py-1.5 cursor-pointer flex justify-between items-center group transition-colors duration-100"
                onClick={() => onAction('copyPath')}
            >
                <span>Copy Path</span>
            </div>
            <div
                className="hover:bg-[#094771] hover:text-white px-3 py-1.5 cursor-pointer flex justify-between items-center group transition-colors duration-100"
                onClick={() => onAction('copyRelativePath')}
            >
                <span>Copy Relative Path</span>
            </div>

            <div className="h-[1px] bg-[#454545] my-1 mx-2"></div>

            <div
                className="hover:bg-[#094771] hover:text-white px-3 py-1.5 cursor-pointer flex justify-between items-center group transition-colors duration-100"
                onClick={() => onAction('rename')}
            >
                <span>Rename...</span>
                <span className="text-xs text-[#999999] group-hover:text-white opacity-0 group-hover:opacity-100">Enter</span>
            </div>
            <div
                className="hover:bg-[#d14] hover:text-white px-3 py-1.5 cursor-pointer flex justify-between items-center group transition-colors duration-100"
                onClick={() => onAction('delete')}
            >
                <span>Delete</span>
                <span className="text-xs text-[#999999] group-hover:text-white opacity-0 group-hover:opacity-100">⌫</span>
            </div>
        </div>
    );
};

export default ContextMenu;
