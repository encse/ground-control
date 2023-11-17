Get started:

```
npm install
open with vscode
F5
```

Resource generation:

image needs to be 640x496
```
pip install pysstv
python3 -m pysstv --mode PD120 --vox --fskid csokavar image.png foobar.wav
ffmpeg -i foobar.wav -af "apad=pad_dur=5" static/sstv.mp3
```