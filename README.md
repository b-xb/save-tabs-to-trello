## Setup instructions

### Download and save

1. Click on the Green `Code` button on this page, and then `Download Zip`
2. Save this file somewhere on your computer and then open it up (double click on it)
3. A new folder should now exist (in the same location) called `save-tabs-to-trello-main` which contains all the code for the extension inside of it

### Trello API settings

1. Open up the `save-tabs-to-trello-main` folder
2. Make a copy of the file `api.js-template` and name it `api.js`
3. Now visit [this link](https://trello.com/1/authorize?expiration=never&scope=read,write,account&response_type=token&key=136d43afb4bd6e49971a92a613ffddaf) and click on Allow
4. Make a note of the token provided (this will be a long sequence of random numbers and letters)
5. Open up the `api.js` file in a text editor, replace `XXXXXX` with the token you have been provided, save the file and exit

### Install the extension

1. Visit `chrome://extensions/` in your web browser
2. Click on the switch labelled `Developer Tools` at the top right of this page, so that it moves to the right and turns blue.
3. Click on the `Load Unpacked` button.
4. Locate the `save-tabs-to-trello-main` folder and click on `Select`
5. The extension should now be installed.
6. If you would like the extension to permanently be accessible in your toolbar
   1. Click on the jigsaw puzzle icon on your toolbar
   2. Then click on the pin icon next to the 'Save tabs to trello' so that it turns blue (and is filled in)