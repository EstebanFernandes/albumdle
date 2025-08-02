# 🎵 Albumdle

Albumdle is a fun and challenging music guessing game inspired by the popular "Heardle" and "Wordle" formats. Test your music knowledge by guessing the album based on audio snippets, cover art fragments, or clever clues!

## 🚀 Features

- Guess the album from limited hints
- Daily challenges to keep you coming back


## Online Play
- This is hosted online thanks to [GitHub Pages](https://EstebanFernandes.github.io/albumdle/).
- Play the game [here](https://EstebanFernandes.github.io/albumdle/).
## 🛠️ Getting Started

1. Clone the repository:
    ```
    git clone https://github.com/yourusername/albumdle.git
    ```
2. Start a local server to run the game:
    ```
    cd albumdle
    python -m http.server 8000
    ```
## Data 
The game uses a dataset of albums, artists, and their details. The data is fetched from a CSV file hosted directly on the page.
Original dataset can be found [here](https://www.kaggle.com/datasets/umerhaddii/rolling-stone-album-rankings).
It has been modified to include only the top 500 albums from Rolling Stone's list, and to add additional information such as thumbnail, discogs ID, Popular tracks (fetch from Spotify).

## 📄 License

This project is licensed under the MIT License.

---

Enjoy the game and challenge your friends to see who knows their classic albums !

