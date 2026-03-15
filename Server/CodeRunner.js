const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// Language configurations
const LANGUAGES = {
    javascript: {
        extension: 'js',
        command: (file) => `node "${file}"`,
        timeout: 10000
    },
    python: {
        extension: 'py',
        command: (file) => `python3 "${file}"`,
        timeout: 10000
    },
    java: {
        extension: 'java',
        compile: (file, dir) => `cd "${dir}" && javac "${path.basename(file)}"`,
        run: (file, dir) => {
            const className = path.basename(file, '.java');
            return `cd "${dir}" && java "${className}"`;
        },
        timeout: 15000
    },
    c: {
        extension: 'c',
        compile: (file, dir) => `gcc "${file}" -o "${path.join(dir, 'program')}"`,
        run: (file, dir) => `"${path.join(dir, 'program')}"`,
        timeout: 15000
    },
    cpp: {
        extension: 'cpp',
        compile: (file, dir) => `g++ "${file}" -o "${path.join(dir, 'program')}"`,
        run: (file, dir) => `"${path.join(dir, 'program')}"`,
        timeout: 15000
    },
    typescript: {
        extension: 'ts',
        // Run TypeScript using ts-node or transpile first
        command: (file) => `npx ts-node "${file}" 2>/dev/null || node "${file}"`,
        timeout: 15000
    }
};

// Execute a command with timeout
function executeCommand(command, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const process = exec(command, { timeout, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                if (error.killed) {
                    reject({ message: 'Execution timed out', stdout, stderr });
                } else {
                    reject({ message: error.message, stdout, stderr });
                }
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

// Main execution function
async function executeCode(language, code) {
    const langConfig = LANGUAGES[language];

    if (!langConfig) {
        return {
            success: false,
            error: `Language "${language}" is not supported. Supported: ${Object.keys(LANGUAGES).join(', ')}`
        };
    }

    // Create temp directory for code execution
    const tempDir = path.join(os.tmpdir(), `coscript-${uuidv4()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Determine filename (for Java, class name must match)
    let filename;
    if (language === 'java') {
        // Extract public class name from Java code
        const classMatch = code.match(/public\s+class\s+(\w+)/);
        filename = classMatch ? `${classMatch[1]}.java` : 'Main.java';
    } else {
        filename = `code.${langConfig.extension}`;
    }

    const filePath = path.join(tempDir, filename);

    try {
        // Write code to file
        fs.writeFileSync(filePath, code);

        let result;

        if (langConfig.compile) {
            // Compiled language (Java, C++)
            try {
                // Compile
                await executeCommand(langConfig.compile(filePath, tempDir), langConfig.timeout);
                // Run
                result = await executeCommand(langConfig.run(filePath, tempDir), langConfig.timeout);
            } catch (compileError) {
                return {
                    success: false,
                    error: compileError.stderr || compileError.message,
                    type: 'compilation'
                };
            }
        } else {
            // Interpreted language (JavaScript, Python)
            try {
                result = await executeCommand(langConfig.command(filePath), langConfig.timeout);
            } catch (runError) {
                return {
                    success: false,
                    error: runError.stderr || runError.message,
                    type: 'runtime'
                };
            }
        }

        return {
            success: true,
            output: result.stdout || '',
            stderr: result.stderr || ''
        };

    } finally {
        // Cleanup temp directory
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}

module.exports = { executeCode, LANGUAGES };
