ALTER TABLE matches ADD COLUMN results_match_id INTEGER;

UPDATE matches
SET results_match_id = CASE match_uid
    WHEN 'match-2026-06-11-Mexico-South_Africa' THEN 537327
    WHEN 'match-2026-06-11-South_Korea-Czech_Republic' THEN 537328
    WHEN 'match-2026-06-12-Canada-Bosnia_&_Herzegovina' THEN 537333
    WHEN 'match-2026-06-12-USA-Paraguay' THEN 537345
    WHEN 'match-2026-06-13-Qatar-Switzerland' THEN 537334
    WHEN 'match-2026-06-13-Brazil-Morocco' THEN 537339
    WHEN 'match-2026-06-13-Haiti-Scotland' THEN 537340
    WHEN 'match-2026-06-13-Australia-Turkey' THEN 537346
    WHEN 'match-2026-06-14-Germany-Curaçao' THEN 537351
    WHEN 'match-2026-06-14-Netherlands-Japan' THEN 537357
    WHEN 'match-2026-06-14-Ivory_Coast-Ecuador' THEN 537352
    WHEN 'match-2026-06-14-Sweden-Tunisia' THEN 537358
    WHEN 'match-2026-06-15-Spain-Cape_Verde' THEN 537369
    WHEN 'match-2026-06-15-Belgium-Egypt' THEN 537363
    WHEN 'match-2026-06-15-Saudi_Arabia-Uruguay' THEN 537370
    WHEN 'match-2026-06-15-Iran-New_Zealand' THEN 537364
    WHEN 'match-2026-06-16-France-Senegal' THEN 537391
    WHEN 'match-2026-06-16-Iraq-Norway' THEN 537392
    WHEN 'match-2026-06-16-Argentina-Algeria' THEN 537397
    WHEN 'match-2026-06-16-Austria-Jordan' THEN 537398
    WHEN 'match-2026-06-17-Portugal-DR_Congo' THEN 537403
    WHEN 'match-2026-06-17-England-Croatia' THEN 537409
    WHEN 'match-2026-06-17-Ghana-Panama' THEN 537410
    WHEN 'match-2026-06-17-Uzbekistan-Colombia' THEN 537404
    WHEN 'match-2026-06-18-Czech_Republic-South_Africa' THEN 537329
    WHEN 'match-2026-06-18-Switzerland-Bosnia_&_Herzegovina' THEN 537335
    WHEN 'match-2026-06-18-Canada-Qatar' THEN 537336
    WHEN 'match-2026-06-18-Mexico-South_Korea' THEN 537330
    WHEN 'match-2026-06-19-USA-Australia' THEN 537348
    WHEN 'match-2026-06-19-Scotland-Morocco' THEN 537342
    WHEN 'match-2026-06-19-Brazil-Haiti' THEN 537341
    WHEN 'match-2026-06-19-Turkey-Paraguay' THEN 537347
    WHEN 'match-2026-06-20-Netherlands-Sweden' THEN 537359
    WHEN 'match-2026-06-20-Germany-Ivory_Coast' THEN 537353
    WHEN 'match-2026-06-20-Ecuador-Curaçao' THEN 537354
    WHEN 'match-2026-06-20-Tunisia-Japan' THEN 537360
    WHEN 'match-2026-06-21-Spain-Saudi_Arabia' THEN 537371
    WHEN 'match-2026-06-21-Belgium-Iran' THEN 537365
    WHEN 'match-2026-06-21-Uruguay-Cape_Verde' THEN 537372
    WHEN 'match-2026-06-21-New_Zealand-Egypt' THEN 537366
    WHEN 'match-2026-06-22-Argentina-Austria' THEN 537399
    WHEN 'match-2026-06-22-France-Iraq' THEN 537393
    WHEN 'match-2026-06-22-Norway-Senegal' THEN 537394
    WHEN 'match-2026-06-22-Jordan-Algeria' THEN 537400
    WHEN 'match-2026-06-23-Portugal-Uzbekistan' THEN 537405
    WHEN 'match-2026-06-23-England-Ghana' THEN 537411
    WHEN 'match-2026-06-23-Panama-Croatia' THEN 537412
    WHEN 'match-2026-06-23-Colombia-DR_Congo' THEN 537406
    WHEN 'match-2026-06-24-Switzerland-Canada' THEN 537337
    WHEN 'match-2026-06-24-Bosnia_&_Herzegovina-Qatar' THEN 537338
    WHEN 'match-2026-06-24-Morocco-Haiti' THEN 537344
    WHEN 'match-2026-06-24-Scotland-Brazil' THEN 537343
    WHEN 'match-2026-06-24-Czech_Republic-Mexico' THEN 537331
    WHEN 'match-2026-06-24-South_Africa-South_Korea' THEN 537332
    WHEN 'match-2026-06-25-Ecuador-Germany' THEN 537355
    WHEN 'match-2026-06-25-Curaçao-Ivory_Coast' THEN 537356
    WHEN 'match-2026-06-25-Tunisia-Netherlands' THEN 537361
    WHEN 'match-2026-06-25-Japan-Sweden' THEN 537362
    WHEN 'match-2026-06-25-Turkey-USA' THEN 537349
    WHEN 'match-2026-06-25-Paraguay-Australia' THEN 537350
    WHEN 'match-2026-06-26-Norway-France' THEN 537395
    WHEN 'match-2026-06-26-Senegal-Iraq' THEN 537396
    WHEN 'match-2026-06-26-Uruguay-Spain' THEN 537373
    WHEN 'match-2026-06-26-Cape_Verde-Saudi_Arabia' THEN 537374
    WHEN 'match-2026-06-26-New_Zealand-Belgium' THEN 537367
    WHEN 'match-2026-06-26-Egypt-Iran' THEN 537368
    WHEN 'match-2026-06-27-Panama-England' THEN 537413
    WHEN 'match-2026-06-27-Croatia-Ghana' THEN 537414
    WHEN 'match-2026-06-27-Colombia-Portugal' THEN 537407
    WHEN 'match-2026-06-27-DR_Congo-Uzbekistan' THEN 537408
    WHEN 'match-2026-06-27-Jordan-Argentina' THEN 537401
    WHEN 'match-2026-06-27-Algeria-Austria' THEN 537402
    WHEN 'match-2026-06-28-2A-2B' THEN 537417
    WHEN 'match-2026-06-29-1E-3A/B/C/D/F' THEN 537423
    WHEN 'match-2026-06-29-1F-2C' THEN 537415
    WHEN 'match-2026-06-29-1C-2F' THEN 537418
    WHEN 'match-2026-06-30-1I-3C/D/F/G/H' THEN 537424
    WHEN 'match-2026-06-30-2E-2I' THEN 537416
    WHEN 'match-2026-06-30-1A-3C/E/F/H/I' THEN 537425
    WHEN 'match-2026-07-01-1L-3E/H/I/J/K' THEN 537426
    WHEN 'match-2026-07-01-1D-3B/E/F/I/J' THEN 537422
    WHEN 'match-2026-07-01-1G-3A/E/H/I/J' THEN 537421
    WHEN 'match-2026-07-02-2K-2L' THEN 537420
    WHEN 'match-2026-07-02-1H-2J' THEN 537419
    WHEN 'match-2026-07-02-1B-3E/F/G/I/J' THEN 537429
    WHEN 'match-2026-07-03-1J-2H' THEN 537428
    WHEN 'match-2026-07-03-1K-3D/E/I/J/L' THEN 537427
    WHEN 'match-2026-07-03-2D-2G' THEN 537430
    WHEN 'match-2026-07-04-W74-W77' THEN 537376
    WHEN 'match-2026-07-04-W73-W75' THEN 537375
    WHEN 'match-2026-07-05-W76-W78' THEN 537377
    WHEN 'match-2026-07-05-W79-W80' THEN 537378
    WHEN 'match-2026-07-06-W83-W84' THEN 537379
    WHEN 'match-2026-07-06-W81-W82' THEN 537380
    WHEN 'match-2026-07-07-W86-W88' THEN 537381
    WHEN 'match-2026-07-07-W85-W87' THEN 537382
    WHEN 'match-2026-07-09-W89-W90' THEN 537383
    WHEN 'match-2026-07-10-W93-W94' THEN 537384
    WHEN 'match-2026-07-11-W91-W92' THEN 537385
    WHEN 'match-2026-07-11-W95-W96' THEN 537386
    WHEN 'match-2026-07-14-W97-W98' THEN 537387
    WHEN 'match-2026-07-15-W99-W100' THEN 537388
    WHEN 'match-2026-07-18-L101-L102' THEN 537389
    WHEN 'match-2026-07-19-W101-W102' THEN 537390
    ELSE results_match_id
END
WHERE match_uid IN (
    'match-2026-06-11-Mexico-South_Africa',
    'match-2026-06-11-South_Korea-Czech_Republic',
    'match-2026-06-12-Canada-Bosnia_&_Herzegovina',
    'match-2026-06-12-USA-Paraguay',
    'match-2026-06-13-Qatar-Switzerland',
    'match-2026-06-13-Brazil-Morocco',
    'match-2026-06-13-Haiti-Scotland',
    'match-2026-06-13-Australia-Turkey',
    'match-2026-06-14-Germany-Curaçao',
    'match-2026-06-14-Netherlands-Japan',
    'match-2026-06-14-Ivory_Coast-Ecuador',
    'match-2026-06-14-Sweden-Tunisia',
    'match-2026-06-15-Spain-Cape_Verde',
    'match-2026-06-15-Belgium-Egypt',
    'match-2026-06-15-Saudi_Arabia-Uruguay',
    'match-2026-06-15-Iran-New_Zealand',
    'match-2026-06-16-France-Senegal',
    'match-2026-06-16-Iraq-Norway',
    'match-2026-06-16-Argentina-Algeria',
    'match-2026-06-16-Austria-Jordan',
    'match-2026-06-17-Portugal-DR_Congo',
    'match-2026-06-17-England-Croatia',
    'match-2026-06-17-Ghana-Panama',
    'match-2026-06-17-Uzbekistan-Colombia',
    'match-2026-06-18-Czech_Republic-South_Africa',
    'match-2026-06-18-Switzerland-Bosnia_&_Herzegovina',
    'match-2026-06-18-Canada-Qatar',
    'match-2026-06-18-Mexico-South_Korea',
    'match-2026-06-19-USA-Australia',
    'match-2026-06-19-Scotland-Morocco',
    'match-2026-06-19-Brazil-Haiti',
    'match-2026-06-19-Turkey-Paraguay',
    'match-2026-06-20-Netherlands-Sweden',
    'match-2026-06-20-Germany-Ivory_Coast',
    'match-2026-06-20-Ecuador-Curaçao',
    'match-2026-06-20-Tunisia-Japan',
    'match-2026-06-21-Spain-Saudi_Arabia',
    'match-2026-06-21-Belgium-Iran',
    'match-2026-06-21-Uruguay-Cape_Verde',
    'match-2026-06-21-New_Zealand-Egypt',
    'match-2026-06-22-Argentina-Austria',
    'match-2026-06-22-France-Iraq',
    'match-2026-06-22-Norway-Senegal',
    'match-2026-06-22-Jordan-Algeria',
    'match-2026-06-23-Portugal-Uzbekistan',
    'match-2026-06-23-England-Ghana',
    'match-2026-06-23-Panama-Croatia',
    'match-2026-06-23-Colombia-DR_Congo',
    'match-2026-06-24-Switzerland-Canada',
    'match-2026-06-24-Bosnia_&_Herzegovina-Qatar',
    'match-2026-06-24-Morocco-Haiti',
    'match-2026-06-24-Scotland-Brazil',
    'match-2026-06-24-Czech_Republic-Mexico',
    'match-2026-06-24-South_Africa-South_Korea',
    'match-2026-06-25-Ecuador-Germany',
    'match-2026-06-25-Curaçao-Ivory_Coast',
    'match-2026-06-25-Tunisia-Netherlands',
    'match-2026-06-25-Japan-Sweden',
    'match-2026-06-25-Turkey-USA',
    'match-2026-06-25-Paraguay-Australia',
    'match-2026-06-26-Norway-France',
    'match-2026-06-26-Senegal-Iraq',
    'match-2026-06-26-Uruguay-Spain',
    'match-2026-06-26-Cape_Verde-Saudi_Arabia',
    'match-2026-06-26-New_Zealand-Belgium',
    'match-2026-06-26-Egypt-Iran',
    'match-2026-06-27-Panama-England',
    'match-2026-06-27-Croatia-Ghana',
    'match-2026-06-27-Colombia-Portugal',
    'match-2026-06-27-DR_Congo-Uzbekistan',
    'match-2026-06-27-Jordan-Argentina',
    'match-2026-06-27-Algeria-Austria',
    'match-2026-06-28-2A-2B',
    'match-2026-06-29-1E-3A/B/C/D/F',
    'match-2026-06-29-1F-2C',
    'match-2026-06-29-1C-2F',
    'match-2026-06-30-1I-3C/D/F/G/H',
    'match-2026-06-30-2E-2I',
    'match-2026-06-30-1A-3C/E/F/H/I',
    'match-2026-07-01-1L-3E/H/I/J/K',
    'match-2026-07-01-1D-3B/E/F/I/J',
    'match-2026-07-01-1G-3A/E/H/I/J',
    'match-2026-07-02-2K-2L',
    'match-2026-07-02-1H-2J',
    'match-2026-07-02-1B-3E/F/G/I/J',
    'match-2026-07-03-1J-2H',
    'match-2026-07-03-1K-3D/E/I/J/L',
    'match-2026-07-03-2D-2G',
    'match-2026-07-04-W74-W77',
    'match-2026-07-04-W73-W75',
    'match-2026-07-05-W76-W78',
    'match-2026-07-05-W79-W80',
    'match-2026-07-06-W83-W84',
    'match-2026-07-06-W81-W82',
    'match-2026-07-07-W86-W88',
    'match-2026-07-07-W85-W87',
    'match-2026-07-09-W89-W90',
    'match-2026-07-10-W93-W94',
    'match-2026-07-11-W91-W92',
    'match-2026-07-11-W95-W96',
    'match-2026-07-14-W97-W98',
    'match-2026-07-15-W99-W100',
    'match-2026-07-18-L101-L102',
    'match-2026-07-19-W101-W102'
);