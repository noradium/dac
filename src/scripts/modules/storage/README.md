# storage
ignore_pairs, selected_pairs の２つのリストを localStorage に保存しています。
コメントの表示非表示を決定するときの優先度は、`selected_pairs > ignore_pairs`

## ignore_ids_storage
この動画のコメントは出したくないと思った動画のidリスト
`string[]`

## selected_pairs_storage
このコメントを出したいと思って結びつけた動画のidのペアーのリスト
`{[key: string]: string}[]`
