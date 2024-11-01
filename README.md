# Unofficial MakerWorld Assistant Chrome Extension

[Chrome Store: An Unofficial MakerWorld Extension](https://chromewebstore.google.com/detail/an-unofficial-makerworld/pkpnnfiegdfdidhbhnecpbnmlgekanbl)

This is an unofficial Chrome extension that adds additional functionality to the [MakerWorld](https://makerworld.com) website for 3D printing designers. The extension enhances the design cards on the maker and model pages by displaying additional information such as Hot Score, Reward Points, Gift Card Value, and Contest Name (if applicable).

![user profile](https://github.com/huddleboards/maker-world-extension/blob/main/images/user-profile.png?raw=true)

## Features

- **Hot Score**: Displays the Hot Score for each design if available.
- **Reward Points**: Shows the Reward Points earned based on the download and print counts.
- **Gift Card Value**: Estimates the approximate monetary value (in dollars) of the earned Reward Points.
- **Contest Name**: If the design is part of a contest, the contest name is displayed.
- **Open** and **Download** buttons: Allows users to easily open or download the default instance of a design directly from the design card.
- **Notifications**: Displays a windows notification when a new comment or model notification is received. 

## Installation

### Chrome
1. Clone or download the repository to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable the "Developer mode" toggle switch in the top-right corner of the extensions page.
4. Click the "Load unpacked" button and select the folder containing the extension's files.

### Firefox - Requires Firefox v116+ 
1. Clone or download the repository to your local machine.
2. zip the directory.
3. Navigate to `about:debugging#/runtime/this-firefox`
4. Click `Load Temporary Add-on...` and select the extension's .zip file. 

*Note:* Firefox requires submitting an Add-on before it can become a 'Full' Add-on. Until this is done, this Add-on can be loaded 'temporarily' into Firefox. However, upon restarting firefox, it will need to be 're-loaded' using the instructions above. 

The extension should now be installed and active.

## Usage

Once the extension is installed, it will automatically enhance the design cards on the maker and model pages of the MakerWorld website. No additional setup or configuration is required.

## Development

This extension is built using JavaScript and follows a content script approach to interact with the MakerWorld website. The main logic is contained within the `content.js` file, which is injected into the website's context.

If you wish to modify or extend the extension's functionality, you can edit the `content.js` file and reload the extension in the browser.

## Contributing

Contributions are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).
