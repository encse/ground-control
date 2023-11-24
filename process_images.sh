output="static/sstv.mp3"
rm img/*

rm files.txt
for f in imgsrc/*.jpg; do
    filename=$(basename -- "$f")
    filename_no_extension="${filename%.*}"
    
    output_img="img/$filename"
    output_wav="img/$filename_no_extension.wav"
    output_mp3="img/$filename_no_extension.mp3"
    echo $filename

    magick $f -resize  640x496!  \
        -fill "rgba(255,255,255,0.2)" -draw "rectangle 0,0,640,60" \
        \( ./favicon.png  -resize 40x40! \) -gravity northwest -geometry +10+10 -composite  \
        -fill white -gravity NorthWest -pointsize 40 -annotate +60+13 'CSOKASAT-01' \
        $output_img

    python3 -m pysstv --mode PD120 --vox --fskid CSOKASAT-01 $output_img $output_wav
    ffmpeg -i $output_wav  -af "apad=pad_dur=5" $output_mp3 
    echo "file '$output_mp3'" >> files.txt
done

rm $output
ffmpeg -f concat -safe 0 -i files.txt -c copy $output
rm files.txt