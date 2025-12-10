// components/SurveyCreator.tsx
import { useState } from "react";
import { ICreatorOptions } from "survey-creator-core";
import { SurveyCreator } from "survey-creator-react";
import "survey-core/survey-core.css";
import "survey-creator-core/survey-creator-core.css";
import { SurveyCreatorComponent } from "survey-creator-react";
const defaultCreatorOptions: ICreatorOptions = {
  autoSaveEnabled: true,
  collapseOnDrag: true
};
export default function SurveyCreatorWidget(props: { json?: Object, options?: ICreatorOptions }) {
  let [creator, setCreator] = useState<SurveyCreator>();
  if (!creator) {
    creator = new SurveyCreator(props.options || defaultCreatorOptions);
    setCreator(creator);
  }
  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <SurveyCreatorComponent creator={creator} />
    </div>
  );
}