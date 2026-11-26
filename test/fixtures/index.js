export const base = `# This is a test fixture mimicing an Apache .htaccess config file.

Header set "access-control-allowed-origin" "*"

# BEGIN htmodules:replaceme

This content should be replaced


# END htmodules:replaceme


# BEGIN unrelated

# This bit should remain untouched
RewriteBase /
RewriteCond %{REQUEST_FILENAME} *
RewriteRule . / [N,R]


# END unrelated

"Some content in between"
`;
