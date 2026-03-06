#pragma once

#include <QObject>
#include <QString>

class QWidget;

class I18n : public QObject {
    Q_OBJECT
public:
    enum class Language {
        FR,
        EN,
    };

    static I18n& instance();

    QString text(const QString& key) const;
    QString phrase(const QString& raw) const;
    void translateWidgetTree(QWidget* root) const;

    Language language() const { return m_language; }
    QString languageCode() const;

public slots:
    void setLanguage(Language language);
    void setLanguageCode(const QString& code);

signals:
    void languageChanged();

private:
    I18n();
    void loadLanguage();
    void saveLanguage() const;

    Language m_language = Language::FR;
};
