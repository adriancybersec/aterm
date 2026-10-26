export const HELP_TEXT = `Aterx lab shell

These commands run against a virtual filesystem in your browser.
They are not executed on the server or your computer.

pwd  ls  cd  mkdir  rmdir  touch  rm  cp  mv
cat  head  tail  less  chmod  chown  grep  find
echo  wc  whoami  id  history  man  help  clear  export

man <command> prints a short page. Tab completes names.
`;

export const MAN_PAGES: Record<string, string> = {
  pwd: `pwd — print the working directory

pwd
    Print the absolute path of the directory you are in.

This lab accepts pwd and pwd -P.
`,
  ls: `ls — list directory contents

ls [-l] [-a] [-h] [path...]
    -l   long format: permissions, owner, size, time
    -a   include names that start with a dot
    -h   human sizes, with -l

Examples
    ls
    ls -la
    ls -l labs/week1
`,
  cd: `cd — change directory

cd [path]
    With no path, go to your home directory.
    cd ..     parent directory
    cd -      previous directory
    cd ~      home directory

You need execute permission on a directory to enter it.
`,
  mkdir: `mkdir — make directories

mkdir [-p] path...
    -p   create parent directories, and do not complain if it exists

Example
    mkdir -p cases/incidents/2026-03-auth
`,
  rmdir: `rmdir — remove empty directories

rmdir path...
    Refuses a directory that still has files in it.
    Use rm -r when you mean to remove the contents as well.
`,
  touch: `touch — create an empty file or update its time

touch path...
    Creates the file if it is missing.
    Does not change the contents of a file that already exists.
`,
  rm: `rm — remove files

rm [-r] [-f] path...
    -r   remove a directory and everything inside it
    -f   ignore missing files

rm will not remove the filesystem root.
A directory without -r is left alone.
`,
  cp: `cp — copy files

cp [-r] source... dest
    -r   copy a directory

This lab copies contents. It does not run anything it copies.
`,
  mv: `mv — move or rename files

mv source... dest
    Renames a file, or moves it into a directory.
`,
  cat: `cat — print files

cat [file...]
    Prints each file in order.
    With no file, reads the pipe. This lab has no interactive stdin.

Example
    cat docs/policy.txt
    cat docs/policy.txt logs/auth.log
`,
  head: `head — print the start of a file

head [-n count] [file...]
    Default count is 10.

Examples
    head -n 5 logs/auth.log
    head -5 logs/auth.log
`,
  tail: `tail — print the end of a file

tail [-n count] [file...]
    Default count is 10.

Example
    tail -n 20 logs/auth.log
`,
  less: `less — read a file one screen at a time

less file
    space   next screen
    b       previous screen
    q       quit

In a pipe, less prints the whole input.
`,
  chmod: `chmod — change permissions

chmod mode file...
    Numeric: chmod 644 notes.txt
             chmod 600 secrets.txt
             chmod 755 collect.sh
    Symbolic: chmod u+x collect.sh
              chmod go-r secrets.txt

The mode is owner, group, other. Each can read (4), write (2), execute (1).
Setuid and other special bits are ignored in this lab.
You can only chmod a file you own.
`,
  chown: `chown — change owner

chown user file...
chown user:group file...

Users in this lab: student, lab, root.
Groups: student, lab, root.

On a university server, only root can give a file away.
This lab lets you chown a file you own so you can see ls -l change.
`,
  grep: `grep — print lines that match

grep [options] pattern [file...]
    -i   ignore case
    -n   print line numbers
    -v   invert the match
    -c   print a count
    -r   search directories
    -w   whole words
    -E   treat the pattern as a regular expression

Without -E, the pattern is a literal string.

Examples
    grep ERROR logs/app.log
    grep -n WARN logs/app.log
    grep -c ERROR logs/app.log
    grep -r TODO cases
`,
  find: `find — search for files

find [path...] [expression]
    -name pattern    match the file name. Quote patterns: '*.txt'
    -type f|d        file or directory
    -maxdepth n      how deep to walk

Examples
    find /home/student -name '*.txt'
    find cases -type d
`,
  echo: `echo — print text

echo [-n] [text...]
    -n   do not add a newline

Use quotes when the text has spaces.
Redirect with > file  or  >> file.
`,
  wc: `wc — count lines, words, and characters

wc [-l] [-w] [-c] [file...]
`,
  whoami: `whoami — print the current user

whoami
    This lab session is the user student.
`,
  id: `id — print user and group ids

id
`,
  history: `history — list commands from this session

history
    Up and Down on the keyboard also recall commands.
`,
  man: `man — short manual pages

man command
    Pages exist for the built-in lab commands only.
`,
  help: `help — list lab commands

help
`,
  clear: `clear — clear the screen

clear
`,
  export: `export — set an environment variable

export NAME=value
echo $NAME

Single quotes stop expansion. Double quotes do not.
`,
};
