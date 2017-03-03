for file in */*.html
do
 mv "$file" "${file%.xhtml}.html"
done