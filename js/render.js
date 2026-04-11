window.App = window.App || {};
(function () {
  const I = window.App.icons;
  const nf = new Intl.NumberFormat('nl-NL');
  const nf1 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 });

  function n(v) { return typeof v === 'number' ? nf.format(Math.round(v)) : '—'; }
  function n1(v) { return typeof v === 'number' ? nf1.format(v) : '—'; }
  function pct(v) { return typeof v === 'number' ? `${nf1.format(v)}%` : '—'; }
  function eur(v) { return typeof v === 'number' ? `€${nf.format(Math.round(v * 1000))}` : '—'; }
  function km(v) {
    if (typeof v !== 'number') return '—';
    return v < 1 ? `${Math.round(v * 1000)} m` : `${n1(v)} km`;
  }
  function has(v) { return v !== null && v !== undefined && v !== ''; }
  function b(t) { return `<strong>${t}</strong>`; }

  // ---------- themes: friendly narrative voice ----------

  function themeBevolking(s) {
    const p = [];
    if (has(s.AantalInwoners_5)) {
      let line = `In jouw buurt wonen ${b(n(s.AantalInwoners_5) + ' mensen')}.`;
      if (has(s.Mannen_6) && has(s.Vrouwen_7)) {
        line += ` Daarvan zijn er ${b(n(s.Mannen_6))} man en ${b(n(s.Vrouwen_7))} vrouw.`;
      }
      p.push(line);
    }
    if (has(s.k_65JaarOfOuder_12) && has(s.AantalInwoners_5)) {
      const senior = (s.k_65JaarOfOuder_12 / s.AantalInwoners_5) * 100;
      const young = has(s.k_0Tot15Jaar_8) ? (s.k_0Tot15Jaar_8 / s.AantalInwoners_5) * 100 : null;
      let line = `${b(pct(senior))} van de buurt is 65-plusser`;
      if (young !== null) line += `, en ${b(pct(young))} is jonger dan 15 jaar`;
      p.push(line + '.');
    }
    if (has(s.HuishoudensTotaal_29) && has(s.GemiddeldeHuishoudensgrootte_33)) {
      p.push(`Samen vormen ze ${b(n(s.HuishoudensTotaal_29) + ' huishoudens')}, gemiddeld ${b(n1(s.GemiddeldeHuishoudensgrootte_33) + ' personen')} per huishouden.`);
    }
    if (has(s.Nederland_17) && has(s.AantalInwoners_5)) {
      const nl = (s.Nederland_17 / s.AantalInwoners_5) * 100;
      p.push(`${b(pct(nl))} heeft een Nederlandse achtergrond.`);
    }
    return { title: 'Bevolking', subtitle: 'De mensen om je heen', icon: I.people, lines: p };
  }

  function themeWonen(s) {
    const p = [];
    if (has(s.Woningvoorraad_35)) {
      let line = `Jouw buurt telt ${b(n(s.Woningvoorraad_35) + ' woningen')}.`;
      if (has(s.Koopwoningen_47) && has(s.HuurwoningenTotaal_48)) {
        line += ` Daarvan is ${b(pct(s.Koopwoningen_47))} een koopwoning en ${b(pct(s.HuurwoningenTotaal_48))} een huurwoning.`;
      }
      p.push(line);
    }
    if (has(s.GemiddeldeWOZWaardeVanWoningen_39)) {
      p.push(`De gemiddelde WOZ-waarde ligt op ${b(eur(s.GemiddeldeWOZWaardeVanWoningen_39))}.`);
    }
    if (has(s.PercentageEengezinswoning_40)) {
      p.push(`De meeste woningen zijn eengezinswoningen: ${b(pct(s.PercentageEengezinswoning_40))} van het totaal.`);
    }
    if (has(s.BouwjaarMeerDanTienJaarGeleden_51) && s.BouwjaarMeerDanTienJaarGeleden_51 > 90) {
      p.push(`Vrijwel alle woningen staan er al ${b('langer dan tien jaar')}.`);
    } else if (has(s.BouwjaarAfgelopenTienJaar_52)) {
      p.push(`${b(pct(s.BouwjaarAfgelopenTienJaar_52))} van de woningen is in de afgelopen tien jaar gebouwd.`);
    }
    return { title: 'Wonen', subtitle: 'De huizen in jouw straat en omgeving', icon: I.home, lines: p };
  }

  function themeInkomen(s) {
    const p = [];
    if (has(s.GemiddeldInkomenPerInwoner_78)) {
      p.push(`Het gemiddelde inkomen per inwoner is ${b(eur(s.GemiddeldInkomenPerInwoner_78))} per jaar.`);
    }
    if (has(s.k_40PersonenMetLaagsteInkomen_79) && has(s.k_20PersonenMetHoogsteInkomen_80)) {
      p.push(`${b(pct(s.k_40PersonenMetLaagsteInkomen_79))} van de buurt behoort tot de 40% laagste inkomens van Nederland, en ${b(pct(s.k_20PersonenMetHoogsteInkomen_80))} tot de 20% hoogste.`);
    }
    if (has(s.PersonenInArmoede_81)) {
      p.push(`${b(pct(s.PersonenInArmoede_81))} van de inwoners leeft onder de armoedegrens.`);
    }
    if (has(s.Nettoarbeidsparticipatie_71)) {
      p.push(`${b(pct(s.Nettoarbeidsparticipatie_71))} van de werkzame bevolking heeft betaald werk.`);
    }
    return { title: 'Inkomen', subtitle: 'Wat mensen verdienen en doen', icon: I.wallet, lines: p };
  }

  function themeVoorzieningen(s) {
    const p = [];
    const afstanden = [];
    if (has(s.AfstandTotHuisartsenpraktijk_110)) afstanden.push(`een huisarts op ${b(km(s.AfstandTotHuisartsenpraktijk_110))}`);
    if (has(s.AfstandTotGroteSupermarkt_111)) afstanden.push(`een supermarkt op ${b(km(s.AfstandTotGroteSupermarkt_111))}`);
    if (has(s.AfstandTotSchool_113)) afstanden.push(`een basisschool op ${b(km(s.AfstandTotSchool_113))}`);
    if (has(s.AfstandTotKinderdagverblijf_112)) afstanden.push(`een kinderdagverblijf op ${b(km(s.AfstandTotKinderdagverblijf_112))}`);
    if (afstanden.length) p.push(`Vanuit jouw buurt vind je ${afstanden.join(', ')}.`);
    if (has(s.ScholenBinnen3Km_114)) {
      p.push(`Binnen drie kilometer liggen ongeveer ${b(n1(s.ScholenBinnen3Km_114) + ' scholen')}.`);
    }
    return { title: 'Voorzieningen', subtitle: 'Wat je dichtbij kunt vinden', icon: I.pin, lines: p };
  }

  function themeMobiliteit(s) {
    const p = [];
    if (has(s.PersonenautoSTotaal_104)) {
      let line = `Er staan ${b(n(s.PersonenautoSTotaal_104) + ' personenauto\'s')} in de buurt`;
      if (has(s.PersonenautoSPerHuishouden_107)) line += `, gemiddeld ${b(n1(s.PersonenautoSPerHuishouden_107))} per huishouden`;
      p.push(line + '.');
    }
    if (has(s.Motorfietsen_109)) {
      p.push(`Daarnaast zijn er ${b(n(s.Motorfietsen_109) + ' motorfietsen')} geregistreerd.`);
    }
    if (has(s.AantalPubliekeLaadpalen_61)) {
      p.push(`Voor elektrisch rijden zijn er ${b(n(s.AantalPubliekeLaadpalen_61) + ' publieke laadpalen')}.`);
    }
    return { title: 'Mobiliteit', subtitle: 'Hoe de buurt zich verplaatst', icon: I.car, lines: p };
  }

  function themeEnergie(s) {
    const p = [];
    if (has(s.GemiddeldAardgasverbruik_55)) {
      p.push(`Een gemiddelde woning verbruikt ${b(n(s.GemiddeldAardgasverbruik_55) + ' m³')} aardgas
