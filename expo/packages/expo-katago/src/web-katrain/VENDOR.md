2026/09/17: VENDOR.md / 自分用メモ。

1. web-katrainを、リポジトリごと、zip形式でダウンロードしてくる。
web-katrain/src以下、ディレクトリ構成を再現するように移植する。

2. src/engine/katagoの中身をそのままコピーして貼り付ける。
今回の中身は以下の通り。
analysisTransfer.ts	chosenMove.ts		featuresV7Fast.ts	loadModelV8.ts		scoreValue.ts
analyzeAbort.ts		client.ts		graphHash.ts		modelDefaults.ts	searchParams.ts
analyzeMcts.ts		evalV8.ts		historyV7.ts		modelResponse.ts	superkoHistory.ts
backendFallback.ts	fastBoard.ts		humanSlProfile.ts	modelV8.ts		types.ts
binModelParser.ts	featuresV7.ts		limits.ts		positionInputsV7.ts	worker.ts

3. src/engine/katagoから、client.tsと、worker.tsを消す。

4. binModelParser.tsのreadBinaryFloats関数をRNでも動くように修正する。

  // readBinaryFloats(count: number): Float32Array {
    (省略)
  //   return new Float32Array(buf);
  // }
  
  このようにコメントアウトし、

  readBinaryFloats(count: number): Float32Array {
    (省略)
    return result;
  }

  代わりにこれを貼っておく。

5. 上の移植が完了したら、src/engine/katago内のファイルを全て開き、import関連のエラーを見て、必要なファイルを用意していく。
今回、必要になったのは

lib内のgtp.ts
utils内のanimationFrame.ts, gameLogic.ts, goRules.ts, superko.ts
src直下のtypes.ts

である(engine/katago内のtypes.tsは別に存在するので注意)。

6. src直下のtypes.tsは、不要な型をコメントアウトする。
この作業をしないと、ファイルが芋づる式に必要になってしまう。

7. 以上でweb-katrain自体は完成するが、アプリにとってのインターフェースとなるanalyzeBoard.tsにも変更が生じる可能性はあるので対処する。
この際、なるたけ元のファイルに変更は加えないように気をつける。privateな関数にexportをつけることも、なるたけ避ける。
今回の移植で言うと、元ファイルに手を加えたのは上記の通り、types.tsとbinModelParser.tsのみである。
なお、引数として今回から新たに求められるバッチサイズは1とした。

8. engine/katago内で使われていないファイルは削除する。
types.ts, analyzeAbort.ts, analysisTransfer.ts, humanSlProfile.ts, featuresV7.ts, positionInputsV7.ts, 
modelResponse.ts, backendFallback.ts, modelDefaults.ts

9. 最終形:
cd Hoshigo/expo/packages/expo-katago/src
find web-katrain -type f

web-katrain/VENDOR.md
web-katrain/src/types.ts
web-katrain/src/lib/gtp.ts
web-katrain/src/utils/goRules.ts
web-katrain/src/utils/gameLogic.ts
web-katrain/src/utils/animationFrame.ts
web-katrain/src/utils/superko.ts

web-katrain/src/engine/katago/scoreValue.ts
web-katrain/src/engine/katago/fastBoard.ts
web-katrain/src/engine/katago/featuresV7Fast.ts
web-katrain/src/engine/katago/evalV8.ts
web-katrain/src/engine/katago/analyzeMcts.ts
web-katrain/src/engine/katago/graphHash.ts
web-katrain/src/engine/katago/chosenMove.ts
web-katrain/src/engine/katago/historyV7.ts
web-katrain/src/engine/katago/modelV8.ts
web-katrain/src/engine/katago/superkoHistory.ts
web-katrain/src/engine/katago/binModelParser.ts
web-katrain/src/engine/katago/limits.ts
web-katrain/src/engine/katago/loadModelV8.ts
web-katrain/src/engine/katago/searchParams.ts

10. webはもちろん、native環境でも必ずテストすること。