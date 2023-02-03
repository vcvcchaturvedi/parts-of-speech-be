import Express from "express";
import multer from "multer";
import nlp from "compromise";
import fs from "fs";
import timeout from "connect-timeout";

const app = Express();
const port = process.env.PORT || 5000;
app.use(Express.json());
app.use(
  Express.urlencoded({
    extended: true,
  })
);
app.use(timeout("180s"));
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "./");
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}`);
  },
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype == "text/plain") {
    cb(null, true);
  } else {
    cb(null, false);
  }
};
const upload = multer({
  fileFilter,
  storage,
  limits: { fileSize: 7000000 },
});
const toPercentage = (count, length) => {
  count /= length;
  count *= 100;
  count = count.toFixed(2);
  return count;
};
app.post("/upload", upload.single("myFile"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.send({ message: "Please provide a file to process." });
    }
    console.log(file.path);
    const text = fs.readFileSync(file.path, { encoding: "utf8" });
    fs.unlink(file.path, () => {});
    const sentencesArray = text.split(".");
    const lengthSentences = sentencesArray.length;
    let nounSentences = 0;
    let verbSentences = 0;
    let adjectiveSentences = 0;
    let adverbSentences = 0;

    await Promise.all(
      sentencesArray.map(async (sentence) => {
        let doc = nlp(sentence);
        nounSentences += doc.has("#noun") ? 1 : 0;
        verbSentences += doc.has("#verb") ? 1 : 0;
        adjectiveSentences += doc.has("#adjective") ? 1 : 0;
        adverbSentences += doc.has("#adverb") ? 1 : 0;
      })
    );

    const nounSentencesPercentage = toPercentage(
      nounSentences,
      lengthSentences
    );
    const verbSentencesPercentage = toPercentage(
      verbSentences,
      lengthSentences
    );
    const adjectiveSentencesPercentage = toPercentage(
      adjectiveSentences,
      lengthSentences
    );
    const adverbSentencesPercentage = toPercentage(
      adverbSentences,
      lengthSentences
    );

    res.send({
      message: "Success",
      data: {
        nounSentencesPercentage,
        verbSentencesPercentage,
        adjectiveSentencesPercentage,
        adverbSentencesPercentage,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Error in handling the file." });
  }
});

app.listen(port, () => console.log(`App listening on port ${port}`));
