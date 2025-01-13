#!/bin/sh
#
# git prepare-commit-msg hook for automatically prepending an issue key
# from the start of the current branch name to commit messages.


# This commit hook will extract a Jira issue key from your branch name (you are naming your branches with issue key’s aren’t you?) and append it to all commit messages so that many places across our products can glue commits together with issues.
#
# To use this:
#
# make sure the folder(s) ~/.git_template/hooks exists
# drop this file in there and make sure it’s named prepare-commit-msg
# make ~/.git_template/hooks/prepare-commit-msg executable. (chmod +x)
# make sure your ~/.gitconfig contains
# [init]
# templatedir = ~/.git_template
# Now anytime you checkout a repo OR use git init in a directory, the prepare-commit-msg will be copied into your project’s .git/hooks folder.
#
# Note: You can safely run git init within pre-existing git projects to get the file copied over

# On Windows, it might not be clear where the `~` folder is. Ultimately, this folder is where Git creates your user global .git_config file. You probably have a global config.
#
# git config --global --list --show-origin will show you a list of existing config options and where they were found, including the filename.
#
# Once you found where your .git_config file is, follow the above instructions. I did not need to change the proposed templatedir value in step 4, nor the shebang in the file, but your mileage may vary.
#
# and… if the script isn’t running, double check your settings for core.hooksPath interfering:
# git config --show-origin core.hooksPath


# many thanks to contributions from 
# @foo @Erwin Vrolijk @Joshua Jacobson @Brett Taylor @Jonathan Doklovic

# check if commit is merge commit or a commit ammend
if [ $2 = "merge" ] || [ $2 = "commit" ]; then
    exit
fi
ISSUE_KEY=`git branch | grep -o "\* \(.*/\)*[A-Z]\{2,\}-[0-9]\+" | grep -o "[A-Z]\{2,\}-[0-9]\+"`
if [ $? -ne 0 ]; then
    # no issue key in branch, use the default message
    exit
fi

# check if a fixup commit, if it is, use default message
FIXUP_COMMIT=`grep -o "fixup\!" $1`
if [ $? -eq 0 ]; then
    exit
fi


# issue key matched from branch prefix, prepend to commit message
sed -i -e "1s/^/$ISSUE_KEY /" $1



